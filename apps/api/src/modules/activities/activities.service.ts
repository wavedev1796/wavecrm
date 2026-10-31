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
    this.validateReminder(data.dueAt, data.reminderAt);
    return this.prisma.activity.create({
      data: { ...data, type: dto.type, subject: dto.subject },
      include,
    });
  }

  async update(id: string, dto: UpdateActivityDto) {
    const current = await this.findOne(id);
    if (current.status !== "PENDING")
      throw new ConflictException("Solo puedes editar actividades pendientes.");
    const data = await this.relations(dto);
    const dueAt = data.dueAt ?? current.dueAt;
    const reminderAt =
      data.reminderAt === undefined ? current.reminderAt : data.reminderAt;
    this.validateReminder(dueAt, reminderAt);
    return this.prisma.activity.update({
      where: { id },
      data: {
        ...data,
        ...((dto.reminderAt !== undefined ||
          dto.dueAt !== undefined ||
          dto.assigneeId !== undefined) && {
          reminderSentAt: null,
          reminderClaimedAt: null,
        }),
      },
      include,
    });
  }

  async complete(id: string) {
    const activity = await this.findOne(id);
    if (activity.status !== "PENDING")
      throw new ConflictException("La actividad ya no está pendiente.");
    return this.prisma.activity.update({
      where: { id },
      data: { status: "COMPLETED", completedAt: new Date() },
      include,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.activity.delete({ where: { id } });
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
    if (
      data.dealId &&
      !(await this.prisma.deal.findUnique({
        where: { id: data.dealId },
        select: { id: true },
      }))
    )
      throw new BadRequestException("El negocio seleccionado no existe.");
    return data;
  }

  private validateReminder(
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
}

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
