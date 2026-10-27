import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Prisma } from "@wave/database";
import type { ActivityType, LossReason, UserRole } from "@wave/shared";
import { PrismaService } from "../prisma/prisma.service";
import {
  AcceptQuoteDto,
  CreateDealActivityDto,
  CreateDealDto,
  CreateQuoteDto,
  CreatePipelineDto,
  CreateStageDto,
  DealItemDto,
  ListDealsDto,
  UpdateDealDto,
  UpdatePipelineDto,
  UpdateStageDto,
} from "./pipeline.dto";
import {
  BOARD_PAGE,
  dealMetrics,
  dealTotals,
  ecuadorToday,
  MAX_DEAL_VALUE,
  nextQuoteNumber,
  sumGroups,
  toDay,
} from "./deal-rules";
import {
  pendingChecks,
  type GateFacts,
  type GateStage,
  type GateTarget,
  type Pending,
} from "./stage-gates";

const dealInclude = {
  stage: true,
  pipeline: { select: { id: true, name: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
  company: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true } },
  _count: { select: { items: true } },
} satisfies Prisma.DealInclude;
const dealDetailInclude = {
  ...dealInclude,
  contact: {
    select: { id: true, firstName: true, lastName: true, email: true, phone: true },
  },
  company: {
    select: { id: true, name: true, taxId: true, email: true, phone: true },
  },
  items: { orderBy: { position: "asc" } },
  quotes: { orderBy: [{ createdAt: "desc" }, { id: "desc" }] },
  activities: {
    include: { assignee: { select: { id: true, name: true } } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
  },
  stageHistory: {
    include: {
      fromStage: { select: { id: true, name: true } },
      toStage: { select: { id: true, name: true } },
      changedBy: { select: { id: true, name: true } },
    },
    orderBy: [{ changedAt: "desc" }, { id: "desc" }],
  },
} satisfies Prisma.DealInclude;
type Tx = Prisma.TransactionClient;
/** Quien pide el cambio: su rol decide si puede tocar un negocio cerrado. */
export type Actor = { id: string; role: UserRole };
export type TransitionInput = {
  fromStageId?: string;
  reason?: string;
  closedAt?: Date;
  lossReason?: LossReason;
  lossDetail?: string | null;
  /** Solo al perder: seguimiento opcional, como actividad pendiente. */
  followUp?: { type: ActivityType; subject: string; dueAt: Date };
  /** Solo al editar: el pipeline de destino si cambia. */
  pipelineId?: string;
};
/** Datos del negocio que necesitan las reglas: etapa, productos y la última propuesta vigente. */
const gateInclude = {
  stage: true,
  items: { select: { quantity: true, unitPrice: true, taxRate: true } },
  quotes: {
    where: { status: { not: "SUPERSEDED" } },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 1,
    select: { id: true, number: true, status: true, total: true },
  },
} satisfies Prisma.DealInclude;
type GateDeal = Prisma.DealGetPayload<{ include: typeof gateInclude }>;
/** Filtro único de una columna del tablero: una etapa muestra sus abiertos y ganados; LOST, los perdidos. Los rechazados, solo la papelera. */
const columnWhere = (pipelineId: string, column: string): Prisma.DealWhereInput =>
  column === "LOST"
    ? { pipelineId, status: "LOST" }
    : { pipelineId, stageId: column, status: { in: ["OPEN", "WON"] } };
const FORBIDDEN_CLOSED =
  "Solo un administrador puede reabrir o modificar un negocio cerrado.";

@Injectable()
export class PipelineService {
  constructor(private readonly prisma: PrismaService) {}

  listOwners() {
    return this.prisma.user.findMany({
      where: { active: true, activatedAt: { not: null } },
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }, { id: "asc" }],
    });
  }
  listPipelines() {
    return this.prisma.pipeline.findMany({
      include: { stages: { orderBy: { position: "asc" } } },
      orderBy: [{ isDefault: "desc" }, { name: "asc" }, { id: "asc" }],
    });
  }
  createPipeline(dto: CreatePipelineDto) {
    return this.write(async (tx) => {
      const first = !(await tx.pipeline.count());
      const isDefault = first || dto.isDefault === true;
      if (isDefault)
        await tx.pipeline.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      return tx.pipeline.create({ data: { name: dto.name, isDefault } });
    });
  }
  updatePipeline(id: string, dto: UpdatePipelineDto) {
    return this.write(async (tx) => {
      const current = await tx.pipeline.findUnique({ where: { id } });
      if (!current) throw new NotFoundException("Pipeline no encontrado.");
      if (current.isDefault && dto.isDefault === false)
        throw new BadRequestException(
          "Elige otro pipeline predeterminado antes de cambiar este.",
        );
      if (dto.isDefault)
        await tx.pipeline.updateMany({
          where: { isDefault: true },
          data: { isDefault: false },
        });
      return tx.pipeline.update({ where: { id }, data: dto });
    });
  }
  deletePipeline(id: string) {
    return this.write(async (tx) => {
      const pipeline = await tx.pipeline.findUnique({ where: { id } });
      if (!pipeline) throw new NotFoundException("Pipeline no encontrado.");
      if (pipeline.isDefault)
        throw new BadRequestException(
          "No se puede eliminar el pipeline predeterminado.",
        );
      if (await tx.deal.count({ where: { pipelineId: id } }))
        throw new ConflictException(
          "Este pipeline tiene negocios. Reasignalos antes de eliminarlo.",
        );
      if (
        await tx.dealStageHistory.count({
          where: {
            OR: [
              { fromStage: { pipelineId: id } },
              { toStage: { pipelineId: id } },
            ],
          },
        })
      )
        throw new ConflictException(
          "Este pipeline conserva historial y no se puede eliminar.",
        );
      await tx.pipeline.delete({ where: { id } });
    });
  }
  createStage(pipelineId: string, dto: CreateStageDto, actor: Actor) {
    return this.write(async (tx) => {
      if (dto.requirements?.length) this.assertCanSetRequirements(actor);
      if (!(await tx.pipeline.findUnique({ where: { id: pipelineId } })))
        throw new NotFoundException("Pipeline no encontrado.");
      return tx.stage.create({ data: { ...dto, pipelineId } });
    });
  }
  updateStage(id: string, dto: UpdateStageDto, actor: Actor) {
    return this.write(async (tx) => {
      const stage = await tx.stage.findUnique({ where: { id } });
      if (!stage) throw new NotFoundException("Etapa no encontrada.");
      // Guardar el nombre o el color reenvía los requisitos sin cambios: solo cambiarlos exige ADMIN.
      const current = new Set(stage.requirements);
      if (
        dto.requirements &&
        (dto.requirements.length !== current.size ||
          dto.requirements.some((code) => !current.has(code)))
      )
        this.assertCanSetRequirements(actor);
      if (dto.position !== undefined && dto.position !== stage.position) {
        const other = await tx.stage.findUnique({
          where: {
            pipelineId_position: {
              pipelineId: stage.pipelineId,
              position: dto.position,
            },
          },
        });
        if (other) {
          const last = await tx.stage.aggregate({
            where: { pipelineId: stage.pipelineId },
            _max: { position: true },
          });
          await tx.stage.update({
            where: { id },
            data: { position: (last._max.position ?? 0) + 1 },
          });
          await tx.stage.update({
            where: { id: other.id },
            data: { position: stage.position },
          });
        }
      }
      return tx.stage.update({ where: { id }, data: dto });
    });
  }
  deleteStage(id: string) {
    return this.write(async (tx) => {
      // Si no existe, los conteos dan 0 y el delete lanza P2025: write() responde 404.
      if (await tx.deal.count({ where: { stageId: id } }))
        throw new ConflictException(
          "Mueve sus negocios antes de eliminar la etapa.",
        );
      if (
        await tx.dealStageHistory.count({
          where: { OR: [{ fromStageId: id }, { toStageId: id }] },
        })
      )
        throw new ConflictException(
          "Esta etapa conserva historial y no se puede eliminar.",
        );
      await tx.stage.delete({ where: { id } });
    });
  }
  async listDeals(query: ListDealsDto) {
    const where: Prisma.DealWhereInput = {
      pipelineId: query.pipelineId,
      stageId: query.stageId,
      ownerId: query.ownerId,
      status: query.status,
      ...(query.search && {
        title: { contains: query.search, mode: "insensitive" },
      }),
    };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.deal.findMany({
        where,
        include: dealInclude,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.deal.count({ where }),
    ]);
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }
  async board(pipelineId?: string) {
    return this.prisma.$transaction(
      async (tx) => {
        const pipeline = pipelineId
          ? await tx.pipeline.findUnique({ where: { id: pipelineId } })
          : await tx.pipeline.findFirst({
              orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
            });
        if (!pipeline)
          throw new NotFoundException("No hay un pipeline configurado.");
        const stages = await tx.stage.findMany({
          where: { pipelineId: pipeline.id },
          orderBy: { position: "asc" },
        });
        // Cantidad y valor de cada columna y las métricas salen de todos los negocios, no de la página cargada.
        const groups = await tx.deal.groupBy({
          by: ["stageId", "status"],
          where: { pipelineId: pipeline.id },
          _count: { _all: true },
          _sum: { value: true },
        });
        const column = async (key: string, rows: typeof groups) => ({
          ...sumGroups(rows),
          deals: await this.columnDeals(tx, pipeline.id, key, 1),
        });
        const columns = [];
        for (const stage of stages)
          columns.push({
            ...stage,
            ...(await column(
              stage.id,
              groups.filter(
                (g) => g.stageId === stage.id && (g.status === "OPEN" || g.status === "WON"),
              ),
            )),
          });
        return {
          pipeline,
          stages: columns,
          lost: await column(
            "LOST",
            groups.filter((g) => g.status === "LOST"),
          ),
          metrics: dealMetrics(groups),
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
        timeout: 15000, // una consulta por columna: con 5 s por defecto corre el mismo riesgo que la ficha contra Neon
      },
    );
  }
  /** "Ver más": la página siguiente de una columna, con el mismo filtro y orden que el tablero. */
  async boardColumn(pipelineId: string, column: string, page: number) {
    return {
      deals: await this.columnDeals(this.prisma, pipelineId, column, page),
      page,
    };
  }
  private columnDeals(tx: Tx, pipelineId: string, column: string, page: number) {
    return tx.deal.findMany({
      where: columnWhere(pipelineId, column),
      include: dealInclude,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * BOARD_PAGE,
      take: BOARD_PAGE,
    });
  }
  createDeal(dto: CreateDealDto, actorId: string) {
    return this.write(async (tx) => {
      if (!dto.contactId && !dto.companyId)
        throw new BadRequestException(
          "Asocia el negocio a un contacto o una empresa.",
        );
      const stage = await this.requireStage(tx, dto.stageId, dto.pipelineId);
      if (stage.probability === 100)
        throw new BadRequestException(
          "Crea el negocio en otra etapa y gánalo desde su ficha.",
        );
      const ownerId = dto.ownerId || actorId;
      await this.requireOwner(tx, ownerId);
      // Un alta pasa por las mismas reglas: en una etapa con requisitos se exigen desde el inicio.
      const facts: GateFacts = {
        status: "OPEN",
        stage: null,
        contactId: dto.contactId ?? null,
        ownerId,
        need: dto.need ?? null,
        solution: dto.solution ?? null,
        budget: dto.budget ?? null,
        budgetNote: dto.budgetNote ?? null,
        expectedClose: dto.expectedClose ?? null,
        hasInteraction: false,
        hasNextActivity: false,
        quote: null,
        itemsTotal: null,
      };
      const stages = await this.gateStages(tx, [stage.pipelineId]);
      this.rejectPending(
        pendingChecks(facts, { kind: "stage", stage }, stages, {}, ecuadorToday()),
      );
      const deal = await tx.deal.create({
        data: { ...dto, ownerId },
        include: dealInclude,
      });
      await this.recordMove(tx, deal.id, null, stage.id, actorId);
      return deal;
    });
  }
  updateDeal(id: string, dto: UpdateDealDto, actor: Actor) {
    return this.write(async (tx) => {
      const current = await tx.deal.findUnique({
        where: { id },
        include: { stage: true, _count: { select: { items: true } } },
      });
      if (!current) throw new NotFoundException("Negocio no encontrado.");
      this.assertCanChange(current, actor);
      if (dto.value !== undefined && current._count.items)
        throw new BadRequestException(
          "El monto se calcula con los productos. Cámbialos en la ficha del negocio.",
        );
      // Los negocios antiguos sin vinculo pueden moverse; una edicion de sus relaciones debe dejarlos completos.
      if (dto.contactId !== undefined || dto.companyId !== undefined) {
        const contactId =
          dto.contactId === undefined ? current.contactId : dto.contactId;
        const companyId =
          dto.companyId === undefined ? current.companyId : dto.companyId;
        if (!contactId && !companyId)
          throw new BadRequestException(
            "Asocia el negocio a un contacto o una empresa.",
          );
      }
      const { stageId = current.stageId, pipelineId = current.pipelineId, ...fields } = dto;
      await this.requireStage(tx, stageId, pipelineId);
      if (dto.ownerId !== undefined) await this.requireOwner(tx, dto.ownerId);
      await tx.deal.update({ where: { id }, data: fields });
      // Cambiar la etapa al editar pasa por las mismas reglas que el tablero, ya con los datos recién guardados.
      if (stageId !== current.stageId || pipelineId !== current.pipelineId)
        await this.applyTransition(tx, id, stageId, { pipelineId }, actor);
      return tx.deal.findUniqueOrThrow({ where: { id }, include: dealInclude });
    });
  }
  async deleteDeal(id: string, actor: Actor) {
    // Si no existe, el delete lanza P2025 y write() responde 404.
    await this.write(async (tx) => {
      const deal = await tx.deal.findUnique({ where: { id }, select: { status: true } });
      if (deal) this.assertCanChange(deal, actor);
      return tx.deal.delete({ where: { id } });
    });
  }
  /** Papelera: borra de una vez los rechazados elegidos (cualquier rol); cada uno deja una fila DELETED en la auditoría. */
  deleteRejected(ids: string[], actorId: string) {
    return this.write(async (tx) => {
      const deals = await tx.deal.findMany({
        where: { id: { in: ids }, status: "REJECTED" },
        select: {
          id: true,
          title: true,
          value: true,
          lossReason: true,
          lossDetail: true,
          contactId: true,
          companyId: true,
        },
      });
      if (deals.length !== ids.length)
        throw new ConflictException(
          "Solo se eliminan negocios rechazados. Actualiza la papelera.",
        );
      await tx.deal.deleteMany({ where: { id: { in: ids }, status: "REJECTED" } });
      await tx.auditLog.createMany({
        data: deals.map(({ id, value, ...deal }) => ({
          action: "DELETED",
          entityType: "Deal",
          entityId: id,
          userId: actorId,
          changes: { ...deal, value: value.toFixed(2) },
        })),
      });
      return { deleted: deals.length };
    });
  }
  // Sin transacción: solo lee, y con relationJoins la ficha son dos consultas en paralelo.
  findDeal(id: string) {
    return this.detail(this.prisma, id);
  }
  saveItems(id: string, items: DealItemDto[], actor: Actor) {
    return this.write(async (tx) => {
      const deal = await this.requireDeal(tx, id);
      if (deal.status === "WON" || deal.status === "REJECTED")
        throw new ConflictException("Reabre el negocio para cambiar sus productos.");
      this.assertCanChange(deal, actor);
      const totals = dealTotals(items);
      const { subtotal } = totals;
      if (subtotal.greaterThan(MAX_DEAL_VALUE))
        throw new BadRequestException(
          `El subtotal de los productos supera el máximo de ${MAX_DEAL_VALUE}.`,
        );
      await tx.dealItem.deleteMany({ where: { dealId: id } });
      await tx.dealItem.createMany({
        data: items.map((item, position) => ({ ...item, dealId: id, position })),
      });
      // Sin productos el monto vuelve a escribirse a mano y conserva el último valor.
      if (items.length)
        await tx.deal.update({ where: { id }, data: { value: subtotal } });
      // Una propuesta con otros importes deja de valer.
      const live = await this.liveQuotes(tx, id);
      await this.supersede(
        tx,
        id,
        live.filter(
          (quote) =>
            !totals.subtotal.equals(quote.subtotal) ||
            !totals.tax.equals(quote.tax) ||
            !totals.total.equals(quote.total),
        ),
        actor.id,
      );
      return this.detail(tx, id);
    });
  }
  /** Propuesta enviada: COT con los productos y sus totales; la enviada o aceptada anterior queda desactualizada. */
  createQuote(dealId: string, dto: CreateQuoteDto, actor: Actor) {
    return this.write(async (tx) => {
      await this.requireOpenDeal(tx, dealId, actor);
      const items = await tx.dealItem.findMany({
        where: { dealId },
        orderBy: { position: "asc" },
      });
      if (!items.length)
        throw new BadRequestException(
          "Agrega sus productos antes de registrar la propuesta.",
        );
      const today = ecuadorToday();
      const sentAt = dto.sentAt ? toDay(dto.sentAt) : today;
      if (sentAt > today)
        throw new BadRequestException("La fecha de envío no puede ser futura.");
      const validUntil = toDay(dto.validUntil);
      if (validUntil < sentAt)
        throw new BadRequestException(
          "La vigencia debe ser igual o posterior a la fecha de envío.",
        );
      await this.supersede(tx, dealId, await this.liveQuotes(tx, dealId), actor.id);
      const last = await tx.quote.findFirst({
        where: { number: { startsWith: "COT-" } },
        orderBy: { number: "desc" },
        select: { number: true },
      });
      const number = nextQuoteNumber(last?.number);
      const totals = dealTotals(items);
      await tx.quote.create({
        data: {
          number,
          status: "SENT",
          dealId,
          sentAt,
          validUntil,
          ...totals,
          // Copia de lo enviado: si después cambian los productos, la propuesta conserva su detalle.
          items: items.map(({ description, quantity, unitPrice, taxRate }) => ({
            description,
            quantity: quantity.toString(),
            unitPrice: unitPrice.toString(),
            taxRate,
          })),
        },
      });
      await this.audit(tx, dealId, "QUOTE_SENT", actor.id, {
        quoteNumber: number,
        total: totals.total.toFixed(2),
        validUntil: validUntil.toISOString(),
      });
      return this.detail(tx, dealId);
    });
  }
  /** Aceptación con su evidencia, entre el envío y hoy y dentro de la vigencia. */
  acceptQuote(dealId: string, quoteId: string, dto: AcceptQuoteDto, actor: Actor) {
    return this.write(async (tx) => {
      await this.requireOpenDeal(tx, dealId, actor);
      const quote = await tx.quote.findFirst({ where: { id: quoteId, dealId } });
      if (!quote) throw new NotFoundException("Propuesta no encontrada.");
      if (quote.status !== "SENT")
        throw new ConflictException("Solo una propuesta enviada se puede aceptar.");
      const acceptedAt = toDay(dto.acceptedAt);
      if (acceptedAt > ecuadorToday() || (quote.sentAt && acceptedAt < quote.sentAt))
        throw new BadRequestException(
          "La fecha de aceptación debe estar entre el envío y hoy.",
        );
      if (quote.validUntil && acceptedAt > quote.validUntil)
        throw new ConflictException("La propuesta venció; registra una nueva.");
      await tx.quote.update({
        where: { id: quoteId },
        data: { status: "ACCEPTED", acceptedAt, acceptanceNote: dto.acceptanceNote },
      });
      await this.audit(tx, dealId, "QUOTE_ACCEPTED", actor.id, {
        quoteNumber: quote.number,
        acceptedAt: acceptedAt.toISOString(),
        acceptanceNote: dto.acceptanceNote,
      });
      return this.detail(tx, dealId);
    });
  }
  /**
   * Único camino para cambiar de etapa o de estado: mover, ganar (`WON`), perder (`LOST`), rechazar (`REJECTED`), reabrir (`REOPEN`).
   * Comprueba permiso, etapa vista y requisitos con datos guardados; escribe negocio, historial y auditoría juntos.
   */
  transition(id: string, to: string, input: TransitionInput, actor: Actor) {
    return this.write(async (tx) => {
      await this.applyTransition(tx, id, to, input, actor);
      return this.detail(tx, id);
    });
  }
  /** Lo que falta para un cambio, sin escribir: con esto la web arma el modal. Sin transacción: transition() vuelve a comprobar todo. */
  async previewTransition(id: string, to: string, actor: Actor) {
    const { deal, pending } = await this.plan(this.prisma, id, to, {}, actor);
    const quote = deal.quotes[0];
    return {
      pending,
      quote: quote ? { id: quote.id, number: quote.number, status: quote.status } : null,
      items: deal.items.length,
    };
  }
  async history(id: string) {
    if (!(await this.prisma.deal.count({ where: { id } })))
      throw new NotFoundException("Negocio no encontrado.");
    return this.prisma.dealStageHistory.findMany({
      where: { dealId: id },
      include: {
        fromStage: true,
        toStage: true,
        changedBy: { select: { id: true, name: true } },
      },
      orderBy: [{ changedAt: "desc" }, { id: "desc" }],
    });
  }
  createActivity(dealId: string, dto: CreateDealActivityDto, actorId: string) {
    return this.write(async (tx) => {
      const deal = await this.requireDeal(tx, dealId);
      if (deal.status === "REJECTED")
        throw new ConflictException("Reabre el negocio para registrar actividades.");
      const { completedAt, ...fields } = dto;
      if (completedAt && toDay(completedAt) > ecuadorToday())
        throw new BadRequestException(
          "Una actividad ya realizada no puede tener fecha futura.",
        );
      // Con el contacto del negocio, la actividad aparece también en la ficha del contacto.
      return tx.activity.create({
        data: {
          ...fields,
          ...(completedAt && { status: "COMPLETED", completedAt }),
          dealId,
          contactId: deal.contactId,
          companyId: deal.companyId,
          assigneeId: actorId,
        },
        include: { assignee: { select: { id: true, name: true } } },
      });
    });
  }
  completeActivity(dealId: string, activityId: string) {
    return this.write(async (tx) => {
      const activity = await tx.activity.findFirst({
        where: { id: activityId, dealId },
      });
      if (!activity) throw new NotFoundException("Actividad no encontrada.");
      if (activity.status !== "PENDING")
        throw new ConflictException("La actividad ya no está pendiente.");
      return tx.activity.update({
        where: { id: activityId },
        data: { status: "COMPLETED", completedAt: new Date() },
        include: { assignee: { select: { id: true, name: true } } },
      });
    });
  }
  private liveQuotes(tx: Tx, dealId: string) {
    return tx.quote.findMany({
      where: { dealId, status: { in: ["SENT", "ACCEPTED"] } },
      select: { id: true, number: true, subtotal: true, tax: true, total: true },
    });
  }
  /** Una propuesta que deja de valer queda desactualizada, nunca se borra, y la línea de tiempo lo registra. */
  private async supersede(
    tx: Tx,
    dealId: string,
    quotes: { id: string; number: string }[],
    userId: string,
  ) {
    if (!quotes.length) return;
    await tx.quote.updateMany({
      where: { id: { in: quotes.map((quote) => quote.id) } },
      data: { status: "SUPERSEDED" },
    });
    for (const quote of quotes)
      await this.audit(tx, dealId, "QUOTE_SUPERSEDED", userId, { quoteNumber: quote.number });
  }
  private async requireDeal(tx: Tx, id: string) {
    const deal = await tx.deal.findUnique({ where: { id }, include: { stage: true } });
    if (!deal) throw new NotFoundException("Negocio no encontrado.");
    return deal;
  }
  /** Ficha completa: negocio, productos, cotizaciones, actividades, historial y cierres (AuditLog). */
  private async detail(tx: Tx, id: string) {
    // En paralelo fuera de una transacción; dentro, Prisma las encola en su conexión.
    const [deal, closures] = await Promise.all([
      tx.deal.findUnique({ where: { id }, include: dealDetailInclude }),
      tx.auditLog.findMany({
        where: { entityType: "Deal", entityId: id },
        select: {
          id: true,
          action: true,
          changes: true,
          createdAt: true,
          user: { select: { id: true, name: true } },
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      }),
    ]);
    if (!deal) throw new NotFoundException("Negocio no encontrado.");
    return { ...deal, closures };
  }
  private assertCanSetRequirements(actor: Actor) {
    if (actor.role !== "ADMIN")
      throw new ForbiddenException(
        "Solo un administrador cambia los requisitos de una etapa.",
      );
  }
  private async requireOpenDeal(tx: Tx, id: string, actor: Actor) {
    const deal = await this.requireDeal(tx, id);
    this.assertCanChange(deal, actor);
    if (deal.status !== "OPEN")
      throw new ConflictException("Reabre el negocio para cambiar sus propuestas.");
    return deal;
  }
  /** Un negocio cerrado solo lo reabre o modifica un ADMIN. */
  private assertCanChange(deal: { status: string }, actor: Actor) {
    if (deal.status !== "OPEN" && actor.role !== "ADMIN")
      throw new ForbiddenException(FORBIDDEN_CLOSED);
  }
  private rejectPending(pending: Pending[]) {
    if (pending.length)
      throw new UnprocessableEntityException({
        message: "Faltan datos para este cambio de etapa.",
        errors: pending,
      });
  }
  /** Resuelve el destino y calcula lo que falta, sin escribir. Sin destino: no hay nada que cambiar. */
  private async plan(
    tx: Tx,
    id: string,
    to: string,
    input: TransitionInput,
    actor: Actor,
  ): Promise<{ deal: GateDeal; target: GateTarget | null; pending: Pending[] }> {
    const deal = await tx.deal.findUnique({ where: { id }, include: gateInclude });
    if (!deal) throw new NotFoundException("Negocio no encontrado.");
    // Cualquiera pasa un perdido a rechazado; cualquier otro cambio a un cerrado es solo de ADMIN.
    if (to !== "REJECTED" || deal.status !== "LOST") this.assertCanChange(deal, actor);
    if (input.fromStageId && input.fromStageId !== deal.stageId)
      throw new ConflictException(
        "Otra persona movió este negocio. Actualiza el tablero.",
      );
    const target = await this.resolveTarget(
      tx,
      deal,
      to,
      input.pipelineId ?? deal.pipelineId,
    );
    if (!target) return { deal, target, pending: [] };
    const today = ecuadorToday();
    const stages = await this.gateStages(tx, [
      deal.pipelineId,
      ...(target.kind === "stage" ? [target.stage.pipelineId] : []),
    ]);
    const pending = pendingChecks(
      await this.gateFacts(tx, deal, today),
      target,
      stages,
      {
        reason: input.reason,
        lossReason: input.lossReason,
        closedAt: input.closedAt && toDay(input.closedAt),
      },
      today,
    );
    return { deal, target, pending };
  }
  private async resolveTarget(
    tx: Tx,
    deal: GateDeal,
    to: string,
    pipelineId: string,
  ): Promise<GateTarget | null> {
    if (to === "LOST") {
      if (deal.status !== "OPEN")
        throw new ConflictException(
          "Reabre el negocio antes de marcarlo como perdido.",
        );
      return { kind: "lost" };
    }
    if (to === "REJECTED") {
      if (deal.status === "REJECTED")
        throw new ConflictException("Este negocio ya está rechazado.");
      if (deal.status === "WON")
        throw new ConflictException("Reabre el negocio antes de rechazarlo.");
      return { kind: "rejected" };
    }
    if (to === "REOPEN") {
      if (deal.status === "OPEN")
        throw new ConflictException("Este negocio ya está abierto.");
      // Un ganado vuelve a la etapa de donde vino; un perdido o un rechazado se queda donde estaba.
      const stageId =
        deal.status === "WON" && deal.stage.probability === 100
          ? await this.originStage(tx, deal)
          : deal.stageId;
      const stage =
        (await tx.stage.findUnique({ where: { id: stageId } })) ?? deal.stage;
      return { kind: "reopen", stage };
    }
    const stage =
      to === "WON"
        ? await this.wonStage(tx, deal)
        : await this.requireStage(tx, to, pipelineId);
    if (to === "WON" || stage?.probability === 100) {
      if (deal.status === "WON") {
        if (stage?.id === deal.stageId && to !== "WON") return null;
        throw new ConflictException("Este negocio ya está ganado.");
      }
      if (deal.status !== "OPEN")
        throw new ConflictException("Reabre el negocio antes de ganarlo.");
      return { kind: "won", stage };
    }
    if (!stage || (stage.id === deal.stageId && deal.status === "OPEN"))
      return null;
    return { kind: "stage", stage };
  }
  /** Etapa de ganado: la actual si ya es de 100 % o la primera de 100 % del pipeline (puede no haber). */
  private wonStage(tx: Tx, deal: GateDeal) {
    if (deal.stage.probability === 100) return deal.stage;
    return tx.stage.findFirst({
      where: { pipelineId: deal.pipelineId, probability: 100 },
      orderBy: { position: "asc" },
    });
  }
  private gateStages(tx: Tx, pipelineIds: string[]): Promise<GateStage[]> {
    return tx.stage.findMany({
      where: { pipelineId: { in: [...new Set(pipelineIds)] } },
      orderBy: { position: "asc" },
    });
  }
  private async gateFacts(
    tx: Tx,
    deal: GateDeal,
    today: Date,
  ): Promise<GateFacts> {
    const [interactions, upcoming] = await Promise.all([
      tx.activity.count({
        where: {
          dealId: deal.id,
          status: "COMPLETED",
          type: { in: ["CALL", "EMAIL", "MEETING"] },
        },
      }),
      tx.activity.count({
        where: { dealId: deal.id, status: "PENDING", dueAt: { gte: today } },
      }),
    ]);
    const quote = deal.quotes[0];
    return {
      status: deal.status,
      stage: deal.stage,
      contactId: deal.contactId,
      ownerId: deal.ownerId,
      need: deal.need,
      solution: deal.solution,
      budget: deal.budget,
      budgetNote: deal.budgetNote,
      expectedClose: deal.expectedClose,
      hasInteraction: interactions > 0,
      hasNextActivity: upcoming > 0,
      quote: quote ? { status: quote.status, total: quote.total } : null,
      itemsTotal: deal.items.length ? dealTotals(deal.items).total : null,
    };
  }
  /** Comprueba el cambio y lo escribe (negocio, historial con motivo y auditoría) en la transacción de quien llama. */
  private async applyTransition(
    tx: Tx,
    id: string,
    to: string,
    input: TransitionInput,
    actor: Actor,
  ) {
    const { deal, target, pending } = await this.plan(tx, id, to, input, actor);
    this.rejectPending(pending);
    if (!target) return;
    const reason = input.reason?.trim() || null;
    if (target.kind === "lost") {
      const lossDetail = input.lossDetail ?? null;
      const followUp = input.followUp;
      if (followUp && toDay(followUp.dueAt) < ecuadorToday())
        throw new BadRequestException("El seguimiento debe ser de hoy en adelante.");
      await tx.deal.update({
        where: { id },
        data: {
          status: "LOST",
          closedAt: ecuadorToday(),
          lossReason: input.lossReason,
          lossDetail,
        },
      });
      // Perdido es recuperable: conserva propuesta y actividades, y el seguimiento queda pendiente.
      if (followUp)
        await tx.activity.create({
          data: {
            ...followUp,
            dealId: id,
            contactId: deal.contactId,
            companyId: deal.companyId,
            assigneeId: actor.id,
          },
        });
      await this.audit(tx, id, "LOST", actor.id, {
        lossReason: input.lossReason ?? null,
        lossDetail,
        followUpAt: followUp ? toDay(followUp.dueAt).toISOString() : null,
      });
      return;
    }
    if (target.kind === "rejected") {
      const lossDetail = input.lossDetail ?? null;
      await tx.deal.update({
        where: { id },
        data: {
          status: "REJECTED",
          closedAt: ecuadorToday(),
          lossReason: input.lossReason,
          lossDetail,
        },
      });
      // Rechazar invalida el proceso: la propuesta vigente queda rechazada y las actividades pendientes, canceladas.
      const quotes = await this.liveQuotes(tx, id);
      if (quotes.length)
        await tx.quote.updateMany({
          where: { id: { in: quotes.map((quote) => quote.id) } },
          data: { status: "REJECTED" },
        });
      const cancelled = await tx.activity.updateMany({
        where: { dealId: id, status: "PENDING" },
        data: { status: "CANCELLED" },
      });
      await this.audit(tx, id, "REJECTED", actor.id, {
        lossReason: input.lossReason ?? null,
        lossDetail,
        from: deal.status,
        quotes: quotes.map((quote) => quote.number),
        cancelledActivities: cancelled.count,
      });
      return;
    }
    if (target.kind === "won") {
      // pendingChecks ya exigió la fecha real (CLOSED_AT) y la propuesta aceptada (ACCEPTANCE).
      const closedAt = toDay(input.closedAt ?? ecuadorToday());
      const stageId = target.stage?.id ?? deal.stageId;
      await tx.deal.update({
        where: { id },
        data: {
          status: "WON",
          closedAt,
          lossReason: null,
          lossDetail: null,
          stageId,
        },
      });
      if (stageId !== deal.stageId)
        await this.recordMove(tx, id, deal.stageId, stageId, actor.id, reason);
      await this.audit(tx, id, "WON", actor.id, {
        quoteNumber: deal.quotes[0]?.number ?? null,
        closedAt: closedAt.toISOString(),
      });
      return;
    }
    const stage = target.stage;
    const reopening = deal.status !== "OPEN";
    await tx.deal.update({
      where: { id },
      data: {
        stageId: stage.id,
        pipelineId: stage.pipelineId,
        ...(reopening && {
          status: "OPEN",
          closedAt: null,
          lossReason: null,
          lossDetail: null,
        }),
      },
    });
    if (stage.id !== deal.stageId)
      await this.recordMove(tx, id, deal.stageId, stage.id, actor.id, reason);
    if (reopening)
      await this.audit(tx, id, "REOPENED", actor.id, {
        from: deal.status,
        reason,
      });
  }
  /** Etapa a la que vuelve un ganado al reabrirse: de donde vino o la última abierta del pipeline. */
  private async originStage(
    tx: Tx,
    deal: Pick<GateDeal, "id" | "stageId" | "pipelineId">,
  ) {
    const last = await tx.dealStageHistory.findFirst({
      where: {
        dealId: deal.id,
        toStageId: deal.stageId,
        fromStage: {
          is: { pipelineId: deal.pipelineId, probability: { lt: 100 } },
        },
      },
      orderBy: [{ changedAt: "desc" }, { id: "desc" }],
    });
    if (last?.fromStageId) return last.fromStageId;
    const open = await tx.stage.findFirst({
      where: { pipelineId: deal.pipelineId, probability: { lt: 100 } },
      orderBy: { position: "desc" },
    });
    return open?.id ?? deal.stageId;
  }
  private recordMove(
    tx: Tx,
    dealId: string,
    fromStageId: string | null,
    toStageId: string,
    actorId: string,
    reason: string | null = null,
  ) {
    return tx.dealStageHistory.create({
      data: { dealId, fromStageId, toStageId, changedById: actorId, reason },
    });
  }
  private audit(
    tx: Tx,
    dealId: string,
    action:
      | "WON"
      | "LOST"
      | "REJECTED"
      | "REOPENED"
      | "QUOTE_SENT"
      | "QUOTE_ACCEPTED"
      | "QUOTE_SUPERSEDED",
    userId: string,
    changes: Prisma.InputJsonObject,
  ) {
    return tx.auditLog.create({
      data: { action, entityType: "Deal", entityId: dealId, changes, userId },
    });
  }
  private async requireStage(tx: Tx, id: string, pipelineId: string) {
    const stage = await tx.stage.findUnique({ where: { id } });
    if (stage?.pipelineId !== pipelineId)
      throw new BadRequestException(
        "La etapa no pertenece al pipeline indicado.",
      );
    return stage;
  }
  private async requireOwner(tx: Tx, id: string | null) {
    if (
      !id ||
      !(await tx.user.findFirst({
        where: { id, active: true, activatedAt: { not: null } },
      }))
    )
      throw new BadRequestException("Elige un responsable activo.");
  }
  private async write<T>(operation: (tx: Tx) => Promise<T>): Promise<T> {
    try {
      return await this.prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 15000, // ganar encadena ~10 consultas: con los 5 s por defecto caduca contra Neon
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2002")
          throw new ConflictException(
            "Esa posicion ya esta ocupada. Elige otra posicion.",
          );
        if (error.code === "P2003")
          throw new ConflictException(
            "Una de las referencias ya no existe o tiene registros relacionados. Actualiza la pagina.",
          );
        if (error.code === "P2025")
          throw new NotFoundException("El registro ya no existe.");
        if (error.code === "P2034")
          throw new ConflictException(
            "Otra persona modifico estos datos. Actualiza e intenta de nuevo.",
          );
        // La transacción pasó los 15 s (picos de latencia contra Neon): Prisma ya la revirtió.
        if (error.code === "P2028")
          throw new ServiceUnavailableException(
            "El servidor tardó demasiado; no se guardó nada. Intenta de nuevo.",
          );
      }
      throw error;
    }
  }
}
