import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, UserRole } from "@wave/database";
import * as argon2 from "argon2";
import { createToken, hashToken, INVITATION_TTL_MS } from "../../common/tokens";
import { MailerService } from "../mailer/mailer.service";
import { PrismaService } from "../prisma/prisma.service";
import {
  ActivateInvitationDto,
  CreateUserDto,
  ListUsersDto,
  UpdateUserDto,
} from "./users.dto";

const publicUserSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  active: true,
  passwordHash: true,
  invitationExpiresAt: true,
  invitationSentAt: true,
  activatedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  async list(query: ListUsersDto) {
    const where: Prisma.UserWhereInput = {
      ...(query.search && {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { email: { contains: query.search, mode: "insensitive" } },
        ],
      }),
      ...(query.role && { role: query.role }),
      ...(query.status === "active" && { active: true }),
      ...(query.status === "inactive" && {
        active: false,
        passwordHash: { not: null },
      }),
      ...(query.status === "pending" && { passwordHash: null }),
    };
    const skip = (query.page - 1) * query.limit;
    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: publicUserSelect,
        orderBy: [{ active: "desc" }, { name: "asc" }],
        skip,
        take: query.limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      data: users.map(toPublicUser),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
    if (!user) throw new NotFoundException("Usuario no encontrado.");
    return toPublicUser(user);
  }

  async create(dto: CreateUserDto, actorId: string) {
    const invitation = createToken(INVITATION_TTL_MS);
    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          role: dto.role,
          active: false,
          invitationTokenHash: invitation.tokenHash,
          invitationExpiresAt: invitation.expiresAt,
          invitationSentAt: new Date(),
        },
        select: publicUserSelect,
      });
    } catch (error) {
      if (isUniqueConstraint(error))
        throw new ConflictException("Ya existe una cuenta con ese correo.");
      throw error;
    }

    try {
      await this.mailer.sendInvitation(
        { email: user.email, name: user.name },
        invitation.token,
      );
    } catch (error) {
      await this.prisma.user
        .delete({ where: { id: user.id } })
        .catch(() => undefined);
      throw error;
    }
    await this.audit(actorId, "USER_INVITED", user.id, {
      email: user.email,
      role: user.role,
    });
    return toPublicUser(user);
  }

  async update(id: string, dto: UpdateUserDto, actorId: string) {
    const current = await this.requireUser(id);
    if (current.role === UserRole.ADMIN && dto.role === UserRole.VENDEDOR) {
      await this.ensureAnotherActiveAdmin(id);
    }
    try {
      const updated = await this.prisma.user.update({
        where: { id },
        data: dto,
        select: publicUserSelect,
      });
      await this.audit(actorId, "USER_UPDATED", id, dto);
      return toPublicUser(updated);
    } catch (error) {
      if (isUniqueConstraint(error))
        throw new ConflictException("Ya existe una cuenta con ese correo.");
      throw error;
    }
  }

  async deactivate(id: string, actorId: string) {
    if (id === actorId)
      throw new BadRequestException("No puedes desactivar tu propia cuenta.");
    const user = await this.requireUser(id);
    if (user.role === UserRole.ADMIN && user.active)
      await this.ensureAnotherActiveAdmin(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { active: false, refreshTokenHash: null },
      select: publicUserSelect,
    });
    await this.audit(actorId, "USER_DEACTIVATED", id);
    return toPublicUser(updated);
  }

  async reactivate(id: string, actorId: string) {
    const user = await this.requireUser(id);
    if (!user.passwordHash) {
      throw new BadRequestException(
        "La cuenta pendiente debe activarse desde su invitación.",
      );
    }
    const updated = await this.prisma.user.update({
      where: { id },
      data: { active: true },
      select: publicUserSelect,
    });
    await this.audit(actorId, "USER_REACTIVATED", id);
    return toPublicUser(updated);
  }

  async resendInvitation(id: string, actorId: string) {
    const user = await this.requireUser(id);
    if (user.passwordHash)
      throw new BadRequestException("Esta cuenta ya fue activada.");
    const invitation = createToken(INVITATION_TTL_MS);
    await this.mailer.sendInvitation(
      { email: user.email, name: user.name },
      invitation.token,
    );
    const updated = await this.prisma.user.update({
      where: { id },
      data: {
        invitationTokenHash: invitation.tokenHash,
        invitationExpiresAt: invitation.expiresAt,
        invitationSentAt: new Date(),
      },
      select: publicUserSelect,
    });
    await this.audit(actorId, "USER_INVITATION_RESENT", id);
    return toPublicUser(updated);
  }

  async remove(id: string, actorId: string) {
    if (id === actorId)
      throw new BadRequestException("No puedes eliminar tu propia cuenta.");
    const user = await this.requireUser(id);
    if (user.role === UserRole.ADMIN && user.active)
      await this.ensureAnotherActiveAdmin(id);
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (error) {
      if (isForeignKeyConstraint(error)) {
        throw new ConflictException(
          "Este usuario tiene actividad asociada. Desactívalo para conservar el historial.",
        );
      }
      throw error;
    }
    await this.audit(actorId, "USER_DELETED", id, { email: user.email });
  }

  async invitation(token: string) {
    const user = await this.userForInvitation(token);
    return {
      email: maskEmail(user.email),
      name: user.name,
      expiresAt: user.invitationExpiresAt,
    };
  }

  async activate(token: string, dto: ActivateInvitationDto) {
    if (dto.password !== dto.passwordConfirmation) {
      throw new BadRequestException("Las contraseñas no coinciden.");
    }
    const user = await this.userForInvitation(token);
    const result = await this.prisma.user.updateMany({
      where: {
        id: user.id,
        invitationTokenHash: hashToken(token),
        passwordHash: null,
      },
      data: {
        passwordHash: await argon2.hash(dto.password),
        active: true,
        activatedAt: new Date(),
        invitationTokenHash: null,
        invitationExpiresAt: null,
        refreshTokenHash: null,
      },
    });
    if (result.count !== 1)
      throw new BadRequestException("La invitación ya fue utilizada.");
    return { message: "Cuenta activada correctamente." };
  }

  private async userForInvitation(token: string) {
    if (!token || token.length > 200)
      throw new BadRequestException("Invitación inválida.");
    const user = await this.prisma.user.findUnique({
      where: { invitationTokenHash: hashToken(token) },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        invitationExpiresAt: true,
      },
    });
    if (
      !user ||
      user.passwordHash ||
      !user.invitationExpiresAt ||
      user.invitationExpiresAt <= new Date()
    ) {
      throw new BadRequestException(
        "La invitación no existe, venció o ya fue utilizada.",
      );
    }
    return user;
  }

  private async requireUser(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException("Usuario no encontrado.");
    return user;
  }

  private async ensureAnotherActiveAdmin(excludedId: string) {
    const count = await this.prisma.user.count({
      where: {
        id: { not: excludedId },
        role: UserRole.ADMIN,
        active: true,
        passwordHash: { not: null },
      },
    });
    if (!count)
      throw new ForbiddenException(
        "Debe permanecer al menos un administrador activo.",
      );
  }

  private audit(
    userId: string,
    action: string,
    entityId: string,
    changes?: object,
  ) {
    return this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType: "User",
        entityId,
        changes: changes as Prisma.InputJsonValue | undefined,
      },
    });
  }
}

function toPublicUser(
  user: Prisma.UserGetPayload<{ select: typeof publicUserSelect }>,
) {
  const { passwordHash, ...safe } = user;
  return { ...safe, status: userStatus(passwordHash, user.active) };
}

/** Sin contraseña, la invitación sigue pendiente; con ella, manda el interruptor de activo. */
function userStatus(passwordHash: string | null, active: boolean) {
  if (!passwordHash) return "pending";
  return active ? "active" : "inactive";
}

function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  return `${local.slice(0, 2)}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
}

function isUniqueConstraint(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function isForeignKeyConstraint(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  );
}
