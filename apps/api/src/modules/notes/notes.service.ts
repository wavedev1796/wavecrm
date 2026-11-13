import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import type { Prisma } from "@wave/database";
import { MailerService } from "../mailer/mailer.service";
import { ownerScope, type Actor } from "../pipeline/pipeline.service";
import { PrismaService } from "../prisma/prisma.service";
import type { CreateNoteDto, UpdateNoteDto } from "./notes.dto";

const person = { select: { id: true, name: true } } as const;
const include = {
  author: person,
  mentions: { select: { user: person }, orderBy: { createdAt: "asc" } },
} satisfies Prisma.NoteInclude;
type NoteRow = Prisma.NoteGetPayload<{ include: typeof include }>;

const NOT_FOUND = "Nota no encontrada.";

/**
 * Notas de un negocio o un contacto, con menciones a miembros del equipo.
 * Escribir sigue el alcance del historial (ADMIN o el responsable del registro); cambiar o borrar, además,
 * solo el autor o un ADMIN. Mencionar avisa por correo y no da acceso al registro.
 */
@Injectable()
export class NotesService {
  private readonly logger = new Logger(NotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: MailerService,
  ) {}

  async createForDeal(id: string, actor: Actor, dto: CreateNoteDto) {
    const deal = await this.prisma.deal.count({ where: { id, ...ownerScope(actor) } });
    if (!deal) throw new NotFoundException("Negocio no encontrado.");
    return this.create({ dealId: id }, actor, dto);
  }

  async createForContact(id: string, actor: Actor, dto: CreateNoteDto) {
    const contact = await this.prisma.contact.count({ where: { id, ...ownerScope(actor) } });
    if (!contact) throw new NotFoundException("Contacto no encontrado.");
    return this.create({ contactId: id }, actor, dto);
  }

  async update(id: string, actor: Actor, dto: UpdateNoteDto) {
    const note = await this.editable(id, actor);
    const current = note.mentions.map((mention) => mention.userId);
    const mentionIds =
      dto.mentionIds && (await this.members(dto.mentionIds, note.authorId, current));
    // ponytail: la última edición gana; versión optimista si dos personas editan la misma nota a la vez.
    const updated = await this.prisma.$transaction(async (tx) => {
      if (mentionIds) {
        await tx.noteMention.deleteMany({ where: { noteId: id, userId: { notIn: mentionIds } } });
        // Las que ya estaban conservan su notifiedAt: no se vuelve a avisar.
        await tx.noteMention.createMany({
          data: mentionIds.map((userId) => ({ noteId: id, userId })),
          skipDuplicates: true,
        });
      }
      // La auditoría guarda cómo estaba antes del cambio.
      await tx.auditLog.create({
        data: {
          action: "UPDATED",
          entityType: "Note",
          entityId: id,
          userId: actor.id,
          changes: { content: note.content, mentionIds: current },
        },
      });
      return tx.note.update({
        where: { id },
        data: { ...(dto.content !== undefined && { content: dto.content }), editedAt: new Date() },
        include,
      });
    });
    await this.notify(id);
    return shape(updated);
  }

  async remove(id: string, actor: Actor) {
    const note = await this.editable(id, actor);
    // La fila se borra; la auditoría guarda qué decía, de quién era y quién la eliminó.
    await this.prisma.$transaction([
      this.prisma.note.delete({ where: { id } }),
      this.prisma.auditLog.create({
        data: {
          action: "DELETED",
          entityType: "Note",
          entityId: id,
          userId: actor.id,
          changes: {
            content: note.content,
            authorId: note.authorId,
            dealId: note.dealId,
            contactId: note.contactId,
            mentionIds: note.mentions.map((mention) => mention.userId),
          },
        },
      }),
    ]);
  }

  private async create(target: { dealId: string } | { contactId: string }, actor: Actor, dto: CreateNoteDto) {
    const mentionIds = await this.members(dto.mentionIds ?? [], actor.id);
    const note = await this.prisma.note.create({
      data: {
        ...target,
        content: dto.content,
        authorId: actor.id,
        mentions: { create: mentionIds.map((userId) => ({ userId })) },
      },
      include,
    });
    await this.notify(note.id, true);
    return shape(note);
  }

  /**
   * La nota si quien pide puede cambiarla. Fuera del alcance del registro responde 404, igual que si no
   * existiera: no revela la nota. Dentro del alcance, solo el autor o un ADMIN (403).
   */
  private async editable(id: string, actor: Actor) {
    const note = await this.prisma.note.findUnique({
      where: { id },
      include: {
        deal: { select: { ownerId: true } },
        contact: { select: { ownerId: true } },
        mentions: { select: { userId: true } },
      },
    });
    const record = note?.deal ?? note?.contact;
    if (!note || !record || (actor.role !== "ADMIN" && record.ownerId !== actor.id))
      throw new NotFoundException(NOT_FOUND);
    if (actor.role !== "ADMIN" && note.authorId !== actor.id)
      throw new ForbiddenException("Solo quien escribió la nota o un administrador puede cambiarla.");
    return note;
  }

  /** Ids únicos sin el autor. Los nuevos deben ser miembros activos; los que ya estaban se conservan aunque ya no lo sean. */
  private async members(ids: string[], authorId: string, kept: string[] = []) {
    const wanted = [...new Set(ids)].filter((id) => id !== authorId);
    const added = wanted.filter((id) => !kept.includes(id));
    if (added.length) {
      const found = await this.prisma.user.count({
        where: { id: { in: added }, active: true, activatedAt: { not: null } },
      });
      if (found !== added.length)
        throw new BadRequestException("Solo puedes mencionar a miembros activos del equipo.");
    }
    return wanted;
  }

  /**
   * Avisa una sola vez a cada mencionado: reclama la mención (notifiedAt) antes de enviar, así dos guardados
   * seguidos no duplican el correo. Si el envío falla la libera: la nota queda guardada y el aviso se
   * reintenta la próxima vez que se edite. El correo no incluye el texto: la mención no da acceso al registro.
   * Una nota nueva (`created`) avisa además al responsable del registro (P12), salvo que la escribiera él o
   * ya lo hayan mencionado. Ese aviso no se reintenta: la nota no se edita para avisar al responsable.
   */
  private async notify(noteId: string, created = false) {
    const owner = { select: { id: true, email: true, name: true, active: true } } as const;
    const note = await this.prisma.note.findUniqueOrThrow({
      where: { id: noteId },
      select: {
        author: { select: { id: true, name: true } },
        deal: { select: { id: true, title: true, owner } },
        contact: { select: { id: true, firstName: true, lastName: true, owner } },
        mentions: {
          where: { notifiedAt: null, user: { active: true } },
          select: { userId: true, user: { select: { email: true, name: true } } },
        },
      },
    });
    const record = note.deal
      ? { label: `negocio «${note.deal.title}»`, path: `/pipeline/${encodeURIComponent(note.deal.id)}` }
      : note.contact && {
          label: `contacto «${note.contact.firstName} ${note.contact.lastName}»`,
          path: `/contactos/${encodeURIComponent(note.contact.id)}`,
        };
    if (!record) return;
    for (const { userId, user } of note.mentions) {
      const { count } = await this.prisma.noteMention.updateMany({
        where: { noteId, userId, notifiedAt: null },
        data: { notifiedAt: new Date() },
      });
      if (!count) continue;
      try {
        await this.mailer.sendMention(user, note.author.name, record.label, record.path);
      } catch {
        await this.prisma.noteMention.updateMany({ where: { noteId, userId }, data: { notifiedAt: null } });
        this.logger.warn(`No se pudo avisar la mención de la nota ${noteId} a ${userId}.`);
      }
    }
    const responsible = (note.deal ?? note.contact)?.owner;
    if (
      !created ||
      !responsible?.active ||
      responsible.id === note.author.id ||
      note.mentions.some((mention) => mention.userId === responsible.id)
    )
      return;
    try {
      await this.mailer.sendNoteToOwner(responsible, note.author.name, record.label, record.path);
    } catch {
      this.logger.warn(`No se pudo avisar la nota ${noteId} a su responsable ${responsible.id}.`);
    }
  }
}

function shape(note: NoteRow) {
  const { mentions, ...rest } = note;
  return { ...rest, mentions: mentions.map((mention) => mention.user) };
}
