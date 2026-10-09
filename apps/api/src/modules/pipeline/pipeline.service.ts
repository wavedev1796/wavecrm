import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@wave/database";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateDealDto,
  CreatePipelineDto,
  CreateStageDto,
  ListDealsDto,
  UpdateDealDto,
  UpdatePipelineDto,
  UpdateStageDto,
} from "./pipeline.dto";

const dealInclude = {
  stage: true,
  pipeline: { select: { id: true, name: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
  company: { select: { id: true, name: true } },
  owner: { select: { id: true, name: true } },
} satisfies Prisma.DealInclude;
type Tx = Prisma.TransactionClient;

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
      const ownerId = dto.ownerId || actorId;
      await this.requireOwner(tx, ownerId);
      const status = dto.status ?? (stage.probability === 100 ? "WON" : "OPEN");
      const deal = await tx.deal.create({
        data: {
          ...dto,
          ownerId,
          status,
          closedAt: status === "OPEN" ? null : new Date(),
        },
        include: dealInclude,
      });
      await tx.dealStageHistory.create({
        data: { dealId: deal.id, toStageId: stage.id, changedById: actorId },
      });
      return deal;
    });
  }
  updateDeal(id: string, dto: UpdateDealDto, actorId: string) {
    return this.write(async (tx) => {
      const current = await tx.deal.findUnique({
        where: { id },
        include: dealInclude,
      });
      if (!current) throw new NotFoundException("Negocio no encontrado.");
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
      let stageStatus = current.status;
      if (moved) stageStatus = stage.probability === 100 ? "WON" : "OPEN";
      const status = dto.status ?? stageStatus;
      const closedAt =
        status === "OPEN" ? null : (current.closedAt ?? new Date());
      const result = await tx.deal.update({
        where: { id },
        data: { ...dto, status, closedAt },
        include: dealInclude,
      });
      if (moved)
        await tx.dealStageHistory.create({
          data: {
            dealId: id,
            fromStageId: current.stageId,
            toStageId: stageId,
            changedById: actorId,
          },
        });
      return result;
    });
  }
  async deleteDeal(id: string) {
    await this.write(async (tx) => {
      if (!(await tx.deal.findUnique({ where: { id } })))
        throw new NotFoundException("Negocio no encontrado.");
      await tx.deal.delete({ where: { id } });
    });
  }
  async findDeal(id: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: dealInclude,
    });
    if (!deal) throw new NotFoundException("Negocio no encontrado.");
    return deal;
  }
  moveDeal(id: string, stageId: string, actorId: string) {
    return this.updateDeal(id, { stageId }, actorId);
  }
  async history(id: string) {
    await this.findDeal(id);
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
