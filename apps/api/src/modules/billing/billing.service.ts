import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { BillingHandoff, BillingStatus } from "@wave/database";
import { ownerScope, type Actor } from "../pipeline/pipeline.service";
import { PrismaService } from "../prisma/prisma.service";
import type { SendBillingDto } from "./billing.dto";
import { billingStatus, buyerOptions, toBuyer, toInvoiceLines } from "./billing-rules";

const NOT_CONFIGURED = "La facturación no está configurada.";
const UNREACHABLE = "No se pudo contactar a Wave Billing.";
const SENDING = "Ya se está enviando.";
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

type CallResult = { ok: true; data: any } | { ok: false; message: string; reachable: boolean };
export type HandoffView = BillingHandoff & { quoteNumber: string; invoiceNumber: string | null };

/** `001-001-000000012` desde la clave de acceso del SRI (estab, punto de emisión, secuencial). */
const invoiceNumber = (accessKey: string | null) =>
  accessKey ? `${accessKey.slice(24, 27)}-${accessKey.slice(27, 30)}-${accessKey.slice(30, 39)}` : null;

/** Mensaje de Billing: `message` o `error` del cuerpo, o el texto recortado. Nunca el Error de fetch. */
function messageOf(text: string) {
  try {
    const body = JSON.parse(text);
    const found = body?.message ?? body?.error;
    if (found) return String(Array.isArray(found) ? found.join(" ") : found).slice(0, 300);
  } catch {
    // ponytail: cuerpo que no es JSON, se usa el texto tal cual.
  }
  return text.trim().slice(0, 300) || UNREACHABLE;
}

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

    await this.claim(quote.id, previous, { status: "PENDING", buyer: comprador, paymentMethod: dto.paymentMethod });
    const result = await this.call("/api/v1/facturas", {
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

    const data = result.ok
      ? {
          status: billingStatus(result.data.estado),
          accessKey: result.data.claveAcceso,
          sequential: result.data.secuencial,
          authorizationNumber: result.data.numeroAutorizacion,
          authorizedAt: result.data.fechaAutorizacion ? new Date(result.data.fechaAutorizacion) : null,
          messages: result.data.mensajes ?? [],
        }
      : { status: "FAILED" as const, messages: [result.message] };
    const saved = await this.prisma.billingHandoff.update({
      where: { quoteId: quote.id },
      data: { ...data, attempts: { increment: 1 } },
    });
    await this.prisma.auditLog.create({
      data: {
        action: result.ok ? "BILLING_SENT" : "BILLING_FAILED",
        entityType: "Deal",
        entityId: dealId,
        userId: actor.id,
        changes: {
          quoteNumber: quote.number,
          status: data.status,
          ...(result.ok ? { sequential: result.data.secuencial } : { message: result.message }),
        },
      },
    });
    return this.view(saved, quote.number);
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
    const values = Object.fromEntries(SETTINGS.map((key) => [key, this.config.get<string>(key)])) as Record<(typeof SETTINGS)[number], string>;
    if (SETTINGS.some((key) => !values[key])) throw new ServiceUnavailableException(NOT_CONFIGURED);
    return values;
  }

  /** Reclamo confirmado antes de llamar a Billing: crea la fila, o pasa FAILED (o un PENDING viejo) a PENDING. */
  private async claim(quoteId: string, previous: BillingHandoff | null, data: Record<string, unknown>) {
    if (!previous) {
      try {
        await this.prisma.billingHandoff.create({ data: { quoteId, ...data } as never });
        return;
      } catch (error) {
        // P2002: otra petición creó la fila primero (quoteId único).
        if ((error as { code?: string }).code === "P2002") throw new ConflictException(SENDING);
        throw error;
      }
    }
    const { count } = await this.prisma.billingHandoff.updateMany({
      where: {
        quoteId,
        OR: [{ status: { in: ["FAILED"] } }, { status: "PENDING", updatedAt: { lt: new Date(Date.now() - PENDING_TTL_MS) } }],
      },
      data: data as never,
    });
    if (!count) throw new ConflictException(SENDING);
  }

  private async call(path: string, init: { method?: string; body?: unknown } = {}): Promise<CallResult> {
    const cfg = this.settings();
    try {
      const res = await fetch(cfg.WAVE_BILLING_URL + path, {
        method: init.method ?? "GET",
        headers: { "x-api-key": cfg.WAVE_BILLING_API_KEY, "Content-Type": "application/json" },
        body: init.body === undefined ? undefined : JSON.stringify(init.body),
        signal: AbortSignal.timeout(20_000),
      });
      const text = await res.text();
      if (res.ok) return { ok: true, data: JSON.parse(text) };
      return res.status >= 500
        ? { ok: false, message: UNREACHABLE, reachable: false }
        : { ok: false, message: messageOf(text), reachable: true };
    } catch {
      // Nunca el message del error: puede traer la URL.
      return { ok: false, message: UNREACHABLE, reachable: false };
    }
  }
}
