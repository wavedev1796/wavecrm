import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@wave/database";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateDealActivityDto,
  CreateDealDto,
  CreatePipelineDto,
  CreateStageDto,
  DealItemDto,
  ListDealsDto,
  LoseDealDto,
  UpdateDealDto,
  UpdatePipelineDto,
  UpdateStageDto,
} from "./pipeline.dto";
import {
  dealTotals,
  ecuadorToday,
  MAX_DEAL_VALUE,
  nextQuoteNumber,
  toDay,
} from "./deal-rules";

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
  quotes: {
    select: {
      id: true,
      number: true,
      status: true,
      subtotal: true,
      tax: true,
      total: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  },
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
type DealWithStage = Prisma.DealGetPayload<{ include: { stage: true } }>;

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
  createStage(pipelineId: string, dto: CreateStageDto) {
    return this.write(async (tx) => {
      if (!(await tx.pipeline.findUnique({ where: { id: pipelineId } })))
        throw new NotFoundException("Pipeline no encontrado.");
      return tx.stage.create({ data: { ...dto, pipelineId } });
    });
  }
  updateStage(id: string, dto: UpdateStageDto) {
    return this.write(async (tx) => {
      const stage = await tx.stage.findUnique({ where: { id } });
      if (!stage) throw new NotFoundException("Etapa no encontrada.");
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
      if (!(await tx.stage.findUnique({ where: { id } })))
        throw new NotFoundException("Etapa no encontrada.");
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
        const deals = await tx.deal.findMany({
          where: { pipelineId: pipeline.id },
          include: dealInclude,
          orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        });
        return {
          pipeline,
          stages: stages.map((stage) => {
            const items = deals.filter((deal) => deal.stageId === stage.id);
            const value = items.reduce(
              (sum, deal) => sum.plus(deal.value),
              new Prisma.Decimal(0),
            );
            return {
              ...stage,
              deals: items,
              count: items.length,
              value: value.toFixed(2),
            };
          }),
        };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead },
    );
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
      const deal = await tx.deal.create({
        data: { ...dto, ownerId },
        include: dealInclude,
      });
      await this.recordMove(tx, deal.id, null, stage.id, actorId);
      return deal;
    });
  }
  updateDeal(id: string, dto: UpdateDealDto, actorId: string) {
    return this.write(async (tx) => {
      const current = await tx.deal.findUnique({
        where: { id },
        include: { stage: true, _count: { select: { items: true } } },
      });
      if (!current) throw new NotFoundException("Negocio no encontrado.");
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
      const stageId = dto.stageId ?? current.stageId;
      const stage = await this.requireStage(
        tx,
        stageId,
        dto.pipelineId ?? current.pipelineId,
      );
      if (dto.ownerId !== undefined) await this.requireOwner(tx, dto.ownerId);
      const moved = current.stageId !== stageId;
      const closing = moved
        ? await this.stageClosing(tx, current, stage.probability, actorId)
        : {};
      await tx.deal.update({ where: { id }, data: { ...dto, ...closing } });
      if (moved) await this.recordMove(tx, id, current.stageId, stageId, actorId);
      return tx.deal.findUniqueOrThrow({ where: { id }, include: dealInclude });
    });
  }
  async deleteDeal(id: string) {
    await this.write(async (tx) => {
      if (!(await tx.deal.findUnique({ where: { id } })))
        throw new NotFoundException("Negocio no encontrado.");
      await tx.deal.delete({ where: { id } });
    });
  }
  findDeal(id: string) {
    return this.prisma.$transaction((tx) => this.detail(tx, id), {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    });
  }
  saveItems(id: string, items: DealItemDto[]) {
    return this.write(async (tx) => {
      const deal = await this.requireDeal(tx, id);
      if (deal.status === "WON")
        throw new ConflictException("Reabre el negocio para cambiar sus productos.");
      const { subtotal } = dealTotals(items);
      if (subtotal.greaterThan(MAX_DEAL_VALUE))
        throw new BadRequestException(
          "El subtotal de los productos supera el máximo de 999999999999.99.",
        );
      await tx.dealItem.deleteMany({ where: { dealId: id } });
      await tx.dealItem.createMany({
        data: items.map((item, position) => ({ ...item, dealId: id, position })),
      });
      // Sin productos el monto vuelve a escribirse a mano y conserva el último valor.
      if (items.length)
        await tx.deal.update({ where: { id }, data: { value: subtotal } });
      return this.detail(tx, id);
    });
  }
  winDeal(id: string, closedAt: Date | undefined, actorId: string) {
    return this.write(async (tx) => {
      const deal = await this.requireDeal(tx, id);
      if (deal.status === "WON")
        throw new ConflictException("Este negocio ya está ganado.");
      const day = closedAt ? toDay(closedAt) : ecuadorToday();
      if (day > ecuadorToday())
        throw new BadRequestException("La fecha de ganado no puede ser futura.");
      const data = await this.winData(tx, deal, actorId, day);
      const target =
        deal.stage.probability === 100
          ? null
          : await tx.stage.findFirst({
              where: { pipelineId: deal.pipelineId, probability: 100 },
              orderBy: { position: "asc" },
            });
      await tx.deal.update({
        where: { id },
        data: { ...data, ...(target && { stageId: target.id }) },
      });
      if (target) await this.recordMove(tx, id, deal.stageId, target.id, actorId);
      return this.detail(tx, id);
    });
  }
  loseDeal(id: string, dto: LoseDealDto, actorId: string) {
    return this.write(async (tx) => {
      const deal = await this.requireDeal(tx, id);
      if (deal.status !== "OPEN")
        throw new ConflictException(
          "Reabre el negocio antes de marcarlo como perdido.",
        );
      const lossDetail = dto.lossDetail ?? null;
      await this.audit(tx, id, "LOST", actorId, {
        lossReason: dto.lossReason,
        lossDetail,
      });
      await tx.deal.update({
        where: { id },
        data: {
          status: "LOST",
          closedAt: ecuadorToday(),
          lossReason: dto.lossReason,
          lossDetail,
        },
      });
      return this.detail(tx, id);
    });
  }
  reopenDeal(id: string, actorId: string) {
    return this.write(async (tx) => {
      const deal = await this.requireDeal(tx, id);
      if (deal.status === "OPEN")
        throw new ConflictException("Este negocio ya está abierto.");
      const data = await this.reopenData(tx, deal, actorId);
      const stageId =
        deal.stage.probability === 100
          ? await this.originStage(tx, deal)
          : deal.stageId;
      await tx.deal.update({ where: { id }, data: { ...data, stageId } });
      if (stageId !== deal.stageId)
        await this.recordMove(tx, id, deal.stageId, stageId, actorId);
      return this.detail(tx, id);
    });
  }
  moveDeal(id: string, stageId: string, actorId: string) {
    return this.updateDeal(id, { stageId }, actorId);
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
      // Con el contacto del negocio, la actividad aparece también en la ficha del contacto.
      return tx.activity.create({
        data: {
          ...dto,
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
  private async requireDeal(tx: Tx, id: string) {
    const deal = await tx.deal.findUnique({ where: { id }, include: { stage: true } });
    if (!deal) throw new NotFoundException("Negocio no encontrado.");
    return deal;
  }
  /** Ficha completa: negocio, productos, cotizaciones, actividades, historial y cierres (AuditLog). */
  private async detail(tx: Tx, id: string) {
    const deal = await tx.deal.findUnique({ where: { id }, include: dealDetailInclude });
    if (!deal) throw new NotFoundException("Negocio no encontrado.");
    const closures = await tx.auditLog.findMany({
      where: { entityType: "Deal", entityId: id },
      select: {
        id: true,
        action: true,
        changes: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
      },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });
    return { ...deal, closures };
  }
  /** Mover de etapa también cierra: llegar a 100 % es ganar; salir de ahí o mover un perdido es reabrir. */
  private async stageClosing(
    tx: Tx,
    deal: DealWithStage,
    probability: number,
    actorId: string,
  ) {
    if (probability === 100)
      return deal.status === "WON"
        ? {}
        : this.winData(tx, deal, actorId, ecuadorToday());
    return deal.status === "OPEN" ? {} : this.reopenData(tx, deal, actorId);
  }
  /** Ganar: exige productos y crea la cotización en borrador con sus totales. */
  private async winData(
    tx: Tx,
    deal: Pick<DealWithStage, "id">,
    actorId: string,
    closedAt: Date,
  ) {
    const items = await tx.dealItem.findMany({ where: { dealId: deal.id } });
    if (!items.length)
      throw new BadRequestException(
        "Agrega sus productos en la ficha antes de ganarlo.",
      );
    const { subtotal, tax, total } = dealTotals(items);
    const last = await tx.quote.findFirst({
      where: { number: { startsWith: "COT-" } },
      orderBy: { number: "desc" },
      select: { number: true },
    });
    const number = nextQuoteNumber(last?.number);
    await tx.quote.create({
      data: { number, dealId: deal.id, subtotal, tax, total },
    });
    await this.audit(tx, deal.id, "WON", actorId, {
      quoteNumber: number,
      closedAt: closedAt.toISOString(),
    });
    return {
      status: "WON",
      closedAt,
      lossReason: null,
      lossDetail: null,
    } as const;
  }
  /** Reabrir: un ganado pierde su cotización, solo si sigue en borrador. */
  private async reopenData(
    tx: Tx,
    deal: Pick<DealWithStage, "id" | "status">,
    actorId: string,
  ) {
    const quotes =
      deal.status === "WON"
        ? await tx.quote.findMany({
            where: { dealId: deal.id },
            select: { number: true, status: true },
          })
        : [];
    if (quotes.some((quote) => quote.status !== "DRAFT"))
      throw new ConflictException(
        "Su cotización ya salió de borrador; el negocio no se puede reabrir.",
      );
    if (quotes.length) await tx.quote.deleteMany({ where: { dealId: deal.id } });
    await this.audit(tx, deal.id, "REOPENED", actorId, {
      from: deal.status,
      deletedQuotes: quotes.map((quote) => quote.number),
    });
    return {
      status: "OPEN",
      closedAt: null,
      lossReason: null,
      lossDetail: null,
    } as const;
  }
  /** Etapa a la que vuelve un ganado al reabrirse: de donde vino o la última abierta del pipeline. */
  private async originStage(
    tx: Tx,
    deal: Pick<DealWithStage, "id" | "stageId" | "pipelineId">,
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
  ) {
    return tx.dealStageHistory.create({
      data: { dealId, fromStageId, toStageId, changedById: actorId },
    });
  }
  private audit(
    tx: Tx,
    dealId: string,
    action: "WON" | "LOST" | "REOPENED",
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
      }
      throw error;
    }
  }
}
