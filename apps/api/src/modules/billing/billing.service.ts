import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { BillingHandoff, BillingStatus } from "@wave/database";
import { BILLING_UNREACHABLE as UNREACHABLE } from "@wave/shared";
import { ownerScope, type Actor } from "../pipeline/pipeline.service";
import { PrismaService } from "../prisma/prisma.service";
import type { EmailBillingDto, ReissueBillingDto, SendBillingDto } from "./billing.dto";
import { billingStatus, buyerOptions, toBuyer, toInvoiceLines } from "./billing-rules";

const NOT_CONFIGURED = "La facturación no está configurada.";
const SENDING = "Ya se está enviando.";
const NO_INVOICE = "Aún no hay factura en Wave Billing.";
const SETTINGS = [
  "WAVE_BILLING_URL",
  "WAVE_BILLING_API_KEY",
  "WAVE_BILLING_EMISOR_ID",
  "WAVE_BILLING_SUCURSAL_ID",
  "WAVE_BILLING_PTO_EMI",
  "WAVE_BILLING_AMBIENTE",
] as const;
const DELIVERED: BillingStatus[] = ["SENT", "AUTHORIZED", "RETURNED", "NOT_AUTHORIZED"];
const PENDING_TTL_MS = 2 * 60_000;

type Config = Record<(typeof SETTINGS)[number], string>;
type CallResult = { ok: true; data: any } | { ok: false; message: string; reachable: boolean; status?: number };
export type HandoffView = BillingHandoff & { quoteNumber: string; invoiceNumber: string | null };

/** `001-001-000000012` desde la clave de acceso del SRI (estab, punto de emisión, secuencial). */
const invoiceNumber = (accessKey: string | null) =>
  accessKey ? `${accessKey.slice(24, 27)}-${accessKey.slice(27, 30)}-${accessKey.slice(30, 39)}` : null;

/** Mensaje de Billing: `message` o `error` del cuerpo, o el texto recortado. Nunca el Error de fetch. */
function messageOf(text: string, status: number) {
  const str = (x: unknown) => (typeof x === "string" ? x : JSON.stringify(x));
  try {
    const body = JSON.parse(text);
    const found = body?.message ?? body?.error;
    if (found) return (Array.isArray(found) ? found.map(str).join(" ") : str(found)).slice(0, 300);
  } catch {
    // ponytail: cuerpo que no es JSON, se usa el texto tal cual.
  }
  return text.trim().slice(0, 300) || `Wave Billing respondió ${status}.`;
}

/** Campos de la fila desde un comprobante de Billing. */
const fromBilling = (d: any) => ({
  status: billingStatus(d.estado),
  accessKey: d.claveAcceso,
  sequential: d.secuencial,
  authorizationNumber: d.numeroAutorizacion,
  authorizedAt: d.fechaAutorizacion ? new Date(d.fechaAutorizacion) : null,
  messages: d.mensajes ?? [],
  // El comprador que Billing registró manda sobre el que se eligió en el diálogo; sin él, queda el enviado.
  ...(d.comprador && typeof d.comprador === "object" ? { buyer: d.comprador } : {}),
});

@Injectable()
export class BillingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async find(dealId: string, actor: Actor) {
    const { deal, quote } = await this.load(dealId, actor);
    const buyer = buyerOptions(...this.parties(deal));
    const handoff = quote && (await this.prisma.billingHandoff.findUnique({ where: { quoteId: quote.id } }));
    return { handoff: handoff && quote ? this.view(handoff, quote.number) : null, buyer };
  }

  async send(dealId: string, dto: SendBillingDto, actor: Actor): Promise<HandoffView> {
    const { deal, quote } = await this.load(dealId, actor);
    if (deal.status !== "WON" || !quote) throw new ConflictException("La venta debe estar ganada y con cotización aceptada.");
    const cfg = this.settings();
    const previous = await this.prisma.billingHandoff.findUnique({ where: { quoteId: quote.id } });
    if (previous && DELIVERED.includes(previous.status)) return this.view(previous, quote.number);

    const parties = this.parties(deal);
    const offered = buyerOptions(...parties);
    if (!offered) throw new UnprocessableEntityException("No hay a quién facturar.");
    if (!offered.options.includes(dto.buyer)) throw new BadRequestException("No se puede facturar a esa parte.");
    const comprador = toBuyer(dto.buyer, ...parties);
    const lineas = toInvoiceLines(quote.items);

    const raced = await this.claim(quote.id, previous, { status: "PENDING", buyer: comprador, paymentMethod: dto.paymentMethod });
    if (raced) return this.view(raced, quote.number);
    const result = await this.call(cfg, "/api/v1/facturas", {
      method: "POST",
      body: {
        emisorId: cfg.WAVE_BILLING_EMISOR_ID,
        sucursalId: cfg.WAVE_BILLING_SUCURSAL_ID,
        ptoEmi: cfg.WAVE_BILLING_PTO_EMI,
        ambiente: cfg.WAVE_BILLING_AMBIENTE,
        ventaId: quote.id,
        preciosIncluyenIva: false,
        formaPago: dto.paymentMethod,
        comprador,
        lineas,
      },
    });

    const data = result.ok ? fromBilling(result.data) : { status: "FAILED" as const, messages: [result.message] };
    const saved = await this.prisma.billingHandoff.update({
      where: { quoteId: quote.id },
      data: { ...data, attempts: { increment: 1 } },
    });
    await this.audit(result.ok ? "BILLING_SENT" : "BILLING_FAILED", dealId, actor, {
      quoteNumber: quote.number,
      status: data.status,
      ...(result.ok ? { sequential: result.data.secuencial } : { message: result.message }),
    });
    return this.view(saved, quote.number);
  }

  /** Consulta a Billing una entrega `SENT` (o `FAILED`, por si el tiempo agotado sí llegó). */
  async refresh(dealId: string, actor: Actor): Promise<HandoffView> {
    const from: BillingStatus[] = ["SENT", "FAILED"];
    const { quote, row, cfg } = await this.existing(dealId, actor, from, "Esta entrega no se puede consultar.", true);
    const raced = await this.claim(quote.id, row, { status: "PENDING" }, from);
    if (raced) return this.view(raced, quote.number);
    const query = `?emisorId=${encodeURIComponent(cfg.WAVE_BILLING_EMISOR_ID)}&ambiente=${encodeURIComponent(cfg.WAVE_BILLING_AMBIENTE)}`;
    const result = await this.call(cfg, `/api/v1/facturas/por-venta/${quote.id}${query}`);
    if (!result.ok) {
      const restored = await this.prisma.billingHandoff.update({ where: { quoteId: quote.id }, data: { status: row.status } });
      // 404: aún no existe en Billing, la fila queda como estaba.
      if (result.status === 404) return this.view(restored, quote.number);
      throw result.reachable ? new UnprocessableEntityException(result.message) : new BadGatewayException(result.message);
    }
    const data = fromBilling(result.data);
    const saved = await this.prisma.billingHandoff.update({ where: { quoteId: quote.id }, data });
    if (data.status !== row.status) {
      await this.audit("BILLING_STATUS", dealId, actor, { quoteNumber: quote.number, from: row.status, status: data.status });
    }
    return this.view(saved, quote.number);
  }

  /** Reemite una factura devuelta o no autorizada con los datos actuales del comprador. */
  async reissue(dealId: string, dto: ReissueBillingDto, actor: Actor): Promise<HandoffView> {
    const from: BillingStatus[] = ["RETURNED", "NOT_AUTHORIZED"];
    const { deal, quote, row, cfg } = await this.existing(dealId, actor, from, "Esta factura no se puede reemitir.");
    const parties = this.parties(deal);
    if (!buyerOptions(...parties)?.options.includes(dto.buyer)) throw new BadRequestException("No se puede facturar a esa parte.");
    const comprador = toBuyer(dto.buyer, ...parties);
    const raced = await this.claim(quote.id, row, { status: "PENDING", buyer: comprador }, from);
    if (raced) return this.view(raced, quote.number);
    const result = await this.call(cfg, `/api/v1/facturas/${row.accessKey}/reemitir`, { method: "POST", body: { comprador } });
    if (!result.ok) {
      // Sin respuesta: la reemisión pudo haber ocurrido, así que no se vuelve a ofrecer la clave vieja; Consultar reconcilia desde FAILED.
      const data = result.reachable ? { status: row.status } : { status: "FAILED" as const, messages: [UNREACHABLE] };
      await this.prisma.billingHandoff.update({ where: { quoteId: quote.id }, data: { ...data, buyer: row.buyer as never } });
      throw result.reachable ? new UnprocessableEntityException(result.message) : new BadGatewayException(UNREACHABLE);
    }
    const data = fromBilling(result.data);
    const saved = await this.prisma.billingHandoff.update({ where: { quoteId: quote.id }, data: { ...data, attempts: { increment: 1 } } });
    await this.audit("BILLING_REISSUED", dealId, actor, {
      quoteNumber: quote.number,
      previousAccessKey: row.accessKey,
      accessKey: data.accessKey,
      sequential: data.sequential,
      status: data.status,
    });
    return this.view(saved, quote.number);
  }

  /** Reenvía el comprobante autorizado por correo; sin `email`, Billing usa el del comprador. */
  async email(dealId: string, dto: EmailBillingDto, actor: Actor): Promise<HandoffView> {
    const { quote, row, cfg } = await this.existing(dealId, actor, ["AUTHORIZED"], "Solo se reenvía una factura autorizada.");
    const result = await this.call(cfg, `/api/v1/facturas/${row.accessKey}/enviar-correo`, {
      method: "POST",
      body: dto.email ? { email: dto.email } : {},
    });
    if (!result.ok) throw result.reachable ? new UnprocessableEntityException(result.message) : new BadGatewayException(result.message);
    await this.audit("BILLING_EMAILED", dealId, actor, { quoteNumber: quote.number, ...(dto.email ? { email: dto.email } : {}) });
    return this.view(row, quote.number);
  }

  /** RIDE (PDF) o XML del comprobante vigente, tal como los entrega Billing. */
  async file(dealId: string, kind: "ride" | "xml", actor: Actor) {
    const { quote } = await this.load(dealId, actor);
    const row = quote && (await this.prisma.billingHandoff.findUnique({ where: { quoteId: quote.id } }));
    if (!row?.accessKey) throw new ConflictException(NO_INVOICE);
    const cfg = this.settings();
    let res: Response;
    try {
      res = await this.request(cfg, `/api/v1/facturas/${row.accessKey}/${kind === "ride" ? "ride.pdf" : "xml"}`);
    } catch {
      throw new BadGatewayException(UNREACHABLE);
    }
    if (res.status === 404) {
      await res.body?.cancel();
      throw new NotFoundException("Wave Billing no encontró la factura.");
    }
    if (!res.ok) {
      await res.body?.cancel();
      throw new BadGatewayException(UNREACHABLE);
    }
    return {
      data: Buffer.from(await res.arrayBuffer()),
      type: kind === "ride" ? "application/pdf" : (res.headers.get("content-type") ?? "application/xml"),
      name: `${row.accessKey}.${kind === "ride" ? "pdf" : "xml"}`,
    };
  }

  /**
   * Negocio y cotización aceptada con fila en alguno de los estados `allowed`; un `PENDING` es «Ya se está enviando.».
   * `refresh` (consultar) no pide clave ni que el negocio siga ganado, y es el único que reclama un PENDING vencido.
   */
  private async existing(dealId: string, actor: Actor, allowed: BillingStatus[], notAllowed: string, refresh = false) {
    const { deal, quote } = await this.load(dealId, actor);
    const row = quote && (await this.prisma.billingHandoff.findUnique({ where: { quoteId: quote.id } }));
    if (!quote || !row) throw new ConflictException(NO_INVOICE);
    if (!refresh && deal.status !== "WON") throw new ConflictException("El negocio ya no está ganado.");
    const stalePending = refresh && row.status === "PENDING" && row.updatedAt.getTime() < Date.now() - PENDING_TTL_MS;
    if (row.status === "PENDING" && !stalePending) throw new ConflictException(SENDING);
    if (!stalePending && !allowed.includes(row.status)) throw new ConflictException(notAllowed);
    if (!refresh && !row.accessKey) throw new ConflictException(NO_INVOICE);
    return { deal, quote, row, cfg: this.settings() };
  }

  private audit(action: string, dealId: string, actor: Actor, changes: Record<string, unknown>) {
    return this.prisma.auditLog.create({
      data: { action, entityType: "Deal", entityId: dealId, userId: actor.id, changes: changes as never },
    });
  }

  /** Negocio dentro del alcance del actor (si no, 404) y su cotización aceptada más reciente. */
  private async load(dealId: string, actor: Actor) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, ...ownerScope(actor) },
      include: { company: true, contact: true },
    });
    if (!deal) throw new NotFoundException("Negocio no encontrado.");
    const quote = await this.prisma.quote.findFirst({
      where: { dealId, status: "ACCEPTED" },
      orderBy: { createdAt: "desc" },
    });
    return { deal, quote };
  }

  /** Empresa (solo con RUC) y contacto, tal como los lee `billing-rules`. */
  private parties(deal: Awaited<ReturnType<BillingService["load"]>>["deal"]) {
    const { company, contact } = deal;
    return [company?.taxId ? { ...company, taxId: company.taxId } : null, contact] as const;
  }

  private view(row: BillingHandoff, quoteNumber: string): HandoffView {
    return { ...row, quoteNumber, invoiceNumber: invoiceNumber(row.accessKey) };
  }

  private settings() {
    const values = Object.fromEntries(SETTINGS.map((key) => [key, this.config.get<string>(key)])) as Config;
    if (SETTINGS.some((key) => !values[key])) throw new ServiceUnavailableException(NOT_CONFIGURED);
    return values;
  }

  /**
   * Reclamo confirmado antes de llamar a Billing: crea la fila, o pasa de `from` (o un PENDING viejo) a PENDING.
   * Devuelve la fila si otra petición ya la entregó mientras tanto; `null` si el reclamo es nuestro.
   */
  private async claim(
    quoteId: string,
    previous: BillingHandoff | null,
    data: Record<string, unknown>,
    from: BillingStatus[] = ["FAILED"],
  ) {
    if (!previous) {
      try {
        await this.prisma.billingHandoff.create({ data: { quoteId, ...data } as never });
        return null;
      } catch (error) {
        // P2002: otra petición creó la fila primero (quoteId único).
        if ((error as { code?: string }).code === "P2002") throw new ConflictException(SENDING);
        throw error;
      }
    }
    const { count } = await this.prisma.billingHandoff.updateMany({
      where: {
        quoteId,
        OR: [{ status: { in: from } }, { status: "PENDING", updatedAt: { lt: new Date(Date.now() - PENDING_TTL_MS) } }],
      },
      data: data as never,
    });
    if (count) return null;
    const current = await this.prisma.billingHandoff.findUnique({ where: { quoteId } });
    if (current && DELIVERED.includes(current.status)) return current;
    throw new ConflictException(SENDING);
  }

  /** Llamada cruda a Billing: la clave y el tiempo máximo viven aquí. Lanza si no hay red o se agota el tiempo. */
  private request(cfg: Config, path: string, init: { method?: string; body?: unknown } = {}) {
    return fetch(cfg.WAVE_BILLING_URL + path, {
      method: init.method ?? "GET",
      headers: { "x-api-key": cfg.WAVE_BILLING_API_KEY, "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: AbortSignal.timeout(20_000),
    });
  }

  private async call(cfg: Config, path: string, init: { method?: string; body?: unknown } = {}): Promise<CallResult> {
    try {
      const res = await this.request(cfg, path, init);
      const text = await res.text();
      if (res.ok) return { ok: true, data: text ? JSON.parse(text) : {} };
      return res.status >= 500
        ? { ok: false, message: UNREACHABLE, reachable: false, status: res.status }
        : { ok: false, message: messageOf(text, res.status), reachable: true, status: res.status };
    } catch {
      // Nunca el message del error: puede traer la URL.
      return { ok: false, message: UNREACHABLE, reachable: false };
    }
  }
}
