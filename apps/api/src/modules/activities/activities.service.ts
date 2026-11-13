import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@wave/database";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateActivityDto,
  ListActivitiesDto,
  UpdateActivityDto,
} from "./activities.dto";

const include = {
  assignee: { select: { id: true, name: true, email: true } },
  contact: { select: { id: true, firstName: true, lastName: true } },
  company: { select: { id: true, name: true } },
  deal: { select: { id: true, title: true, status: true } },
} satisfies Prisma.ActivityInclude;

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListActivitiesDto) {
    const where: Prisma.ActivityWhereInput = {
      ...(query.type && { type: query.type }),
      ...(query.assigneeId && { assigneeId: query.assigneeId }),
      ...(query.dealId && { dealId: query.dealId }),
      ...(query.status && { status: query.status }),
      ...(query.period === "upcoming" && {
        status: "PENDING",
        dueAt: { gte: startOfToday() },
      }),
      ...(query.period === "overdue" && {
        status: "PENDING",
        dueAt: { lt: startOfToday() },
      }),
      ...(query.period === "all" &&
        !query.status && { status: { not: "CANCELLED" } }),
    };
    const [activities, pending, overdue] = await this.prisma.$transaction([
      this.prisma.activity.findMany({
        where,
        include,
        orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }, { id: "asc" }],
      }),
      this.prisma.activity.count({ where: { status: "PENDING" } }),
      this.prisma.activity.count({
        where: { status: "PENDING", dueAt: { lt: startOfToday() } },
      }),
    ]);
    return {
      data: activities,
      meta: { total: activities.length, pending, overdue },
    };
  }

  findOne(id: string) {
    return this.prisma.activity
      .findUnique({ where: { id }, include })
      .then((activity) => {
        if (!activity) throw new NotFoundException("Actividad no encontrada.");
        return activity;
      });
  }

  async create(dto: CreateActivityDto, actorId: string) {
    const data = await this.relations(dto, actorId);
    assertReminder(data.dueAt, data.reminderAt);
    return this.prisma.activity.create({
      data: {
        ...data,
        type: dto.type,
        subject: dto.subject,
        createdById: actorId,
      },
      include,
    });
  }

  async update(id: string, dto: UpdateActivityDto, actorId: string) {
    const current = await this.findOne(id);
    if (current.status !== "PENDING")
      throw new ConflictException("Solo puedes editar actividades pendientes.");
    const data = await this.relations(dto);
    // dueAt en null borra el vencimiento: el recordatorio no se valida contra la fecha anterior.
    const dueAt = data.dueAt === undefined ? current.dueAt : data.dueAt;
    const reminderAt =
      data.reminderAt === undefined ? current.reminderAt : data.reminderAt;
    assertReminder(dueAt, reminderAt);
    // Antes y después de lo que cambió: reprogramar o reasignar queda en el historial.
    const changes = Object.fromEntries(
      Object.entries(data).flatMap(([key, value]) => {
        const from = plain((current as Record<string, unknown>)[key]);
        const to = plain(value);
        return from === to ? [] : [[key, { from, to }] as const];
      }),
    );
    return this.whilePending(
      id,
      "UPDATED",
      actorId,
      {
        ...data,
        // @updatedAt tiene precisión de milisegundos: avanzar al menos 1 ms evita que dos escrituras
        // dentro del mismo milisegundo conserven la misma versión y dejen pasar una edición obsoleta.
        ...(dto.updatedAt && {
          updatedAt: new Date(Math.max(Date.now(), dto.updatedAt.getTime() + 1)),
        }),
        ...((dto.reminderAt !== undefined ||
          dto.dueAt !== undefined ||
          dto.assigneeId !== undefined) && {
          reminderSentAt: null,
          reminderClaimedAt: null,
        }),
      },
      changes,
      dto.updatedAt ?? current.updatedAt,
    );
  }

  complete(id: string, actorId: string) {
    return this.whilePending(id, "COMPLETED", actorId, {
      status: "COMPLETED",
      completedAt: new Date(),
    }, { status: { from: "PENDING", to: "COMPLETED" } });
  }

  /** Cancelar conserva la actividad (y su historial) y apaga su recordatorio; eliminar la borra. */
  cancel(id: string, actorId: string) {
    return this.whilePending(id, "CANCELLED", actorId, {
      status: "CANCELLED",
      reminderClaimedAt: null,
    }, { status: { from: "PENDING", to: "CANCELLED" } });
  }

  async remove(id: string, actorId: string) {
    const activity = await this.findOne(id);
    // La fila se borra; la auditoría guarda qué era, quién la eliminó y cuándo.
    await this.prisma.$transaction([
      this.prisma.activity.delete({ where: { id } }),
      this.prisma.auditLog.create({
        data: {
          action: "DELETED",
          entityType: "Activity",
          entityId: id,
          userId: actorId,
          changes: {
            type: activity.type,
            subject: activity.subject,
            status: activity.status,
            dueAt: plain(activity.dueAt),
            dealId: activity.dealId,
            contactId: activity.contactId,
            companyId: activity.companyId,
          },
        },
      }),
    ]);
  }

  /**
   * Escribe solo si la actividad sigue pendiente: leer y luego escribir por id dejaba que un doble clic
   * o dos personas la cerraran dos veces. Quién y cuándo quedan en la auditoría.
   */
  private whilePending(
    id: string,
    action: "UPDATED" | "COMPLETED" | "CANCELLED",
    actorId: string,
    data: Prisma.ActivityUncheckedUpdateManyInput,
    changes: Prisma.InputJsonObject = {},
    expectedUpdatedAt?: Date,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.activity.updateMany({
        where: { id, status: "PENDING", ...(expectedUpdatedAt && { updatedAt: expectedUpdatedAt }) },
        data,
      });
      if (!count) {
        const exists = await tx.activity.findUnique({
          where: { id },
          select: { id: true, status: true, updatedAt: true },
        });
        if (!exists) throw new NotFoundException("Actividad no encontrada.");
        if (expectedUpdatedAt && exists.updatedAt?.getTime() !== expectedUpdatedAt.getTime())
          throw new ConflictException("La actividad cambió desde que la abriste. Se recargó la versión más reciente.");
        throw new ConflictException("La actividad ya no está pendiente.");
      }
      await tx.auditLog.create({
        data: { action, entityType: "Activity", entityId: id, userId: actorId, changes },
      });
      return tx.activity.findUniqueOrThrow({ where: { id }, include });
    });
  }

  private async relations(
    dto: CreateActivityDto | UpdateActivityDto,
    actorId?: string,
  ) {
    const data = {
      ...(dto.type !== undefined && { type: dto.type }),
      ...(dto.subject !== undefined && { subject: dto.subject }),
      ...(dto.description !== undefined && {
        description: dto.description || null,
      }),
      ...(dto.dueAt !== undefined && { dueAt: dto.dueAt }),
      ...(dto.reminderAt !== undefined && { reminderAt: dto.reminderAt }),
      ...(actorId && { assigneeId: dto.assigneeId ?? actorId }),
      ...(dto.assigneeId !== undefined && { assigneeId: dto.assigneeId }),
      ...(dto.contactId !== undefined && { contactId: dto.contactId || null }),
      ...(dto.companyId !== undefined && { companyId: dto.companyId || null }),
      ...(dto.dealId !== undefined && { dealId: dto.dealId || null }),
    } satisfies Prisma.ActivityUncheckedUpdateInput;
    if (data.assigneeId) {
      const assignee = await this.prisma.user.findFirst({
        where: { id: data.assigneeId, active: true },
        select: { id: true },
      });
      if (!assignee)
        throw new BadRequestException(
          "El responsable debe ser un usuario activo.",
        );
    }
    if (
      data.contactId &&
      !(await this.prisma.contact.findUnique({
        where: { id: data.contactId },
        select: { id: true },
      }))
    )
      throw new BadRequestException("El contacto seleccionado no existe.");
    if (
      data.companyId &&
      !(await this.prisma.company.findUnique({
        where: { id: data.companyId },
        select: { id: true },
      }))
    )
      throw new BadRequestException("La empresa seleccionada no existe.");
    if (data.dealId) {
      const deal = await this.prisma.deal.findUnique({
        where: { id: data.dealId },
        select: { status: true },
      });
      if (!deal)
        throw new BadRequestException("El negocio seleccionado no existe.");
      // Igual que la ficha: rechazar cancela sus pendientes, así que no se le agregan nuevas.
      if (deal.status === "REJECTED")
        throw new ConflictException(
          "Reversa el negocio para registrar actividades.",
        );
    }
    return data;
  }
}

/** El recordatorio exige vencimiento y no puede ser posterior a él. Lo usan la agenda y la ficha del negocio. */
export function assertReminder(
  dueAt?: Date | string | null,
  reminderAt?: Date | string | null,
) {
  if (reminderAt && !dueAt)
    throw new BadRequestException(
      "Programa una fecha de vencimiento para activar el recordatorio.",
    );
  if (reminderAt && dueAt && new Date(reminderAt) > new Date(dueAt))
    throw new BadRequestException(
      "El recordatorio debe ser anterior al vencimiento.",
    );
}

/** Valor de la auditoría: fechas en ISO y vacío como null. */
const plain = (value: unknown) =>
  value instanceof Date ? value.toISOString() : ((value ?? null) as string | null);

function startOfToday() {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(
    parts.map(({ type, value }) => [type, value]),
  );
  return new Date(
    `${values.year}-${values.month}-${values.day}T00:00:00-05:00`,
  );
}
