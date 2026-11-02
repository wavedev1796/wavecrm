import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import type { ActivityStatus, ActivityType, Prisma } from "@wave/database";
import { PrismaService } from "../prisma/prisma.service";
import { ownerScope, type Actor } from "../pipeline/pipeline.service";
import type { TimelineQueryDto } from "./timeline.dto";

const KINDS = ["ACTIVITY", "EVENT", "NOTE", "STAGE"] as const;
type Kind = (typeof KINDS)[number];
type Ref = { id: string; name: string };
type DealRef = { id: string; title: string };
/** Posición en el orden total (at, kind, id) descendente. `id` es el de la fila, sin el tipo. */
type Cursor = { at: Date; kind: Kind; id: string };
export type TimelineEvent = {
  id: string;
  kind: Kind;
  at: Date;
  author: Ref | null;
  deal: DealRef | null;
  activity?: {
    id: string;
    type: ActivityType;
    status: ActivityStatus;
    subject: string;
    description: string | null;
    dueAt: Date | null;
    completedAt: Date | null;
    assignee: Ref | null;
  };
  note?: { id: string; content: string };
  stage?: { from: Ref | null; to: Ref; reason: string | null };
  event?: { action: string; changes: Record<string, unknown> | null };
};
/** Filtro de cada fuente para un negocio o un contacto, ya con el alcance del usuario. */
type Sources = {
  activity: Prisma.ActivityWhereInput;
  note: Prisma.NoteWhereInput;
  stage: Prisma.DealStageHistoryWhereInput;
  audit: Prisma.AuditLogWhereInput;
  deals: DealRef[];
};

const person = { select: { id: true, name: true } } as const;
const dealRef = { select: { id: true, title: true } } as const;
const INVALID_CURSOR = "El cursor no es válido.";

/** Línea de tiempo de un negocio o un contacto: actividades, notas, cambios de etapa y eventos (AuditLog), del más reciente al más antiguo. */
@Injectable()
export class TimelineService {
  constructor(private readonly prisma: PrismaService) {}

  async forDeal(id: string, actor: Actor, query: TimelineQueryDto) {
    const cursor = decodeCursor(query.cursor);
    const deal = await this.prisma.deal.findFirst({
      where: { id, ...ownerScope(actor) },
      select: { id: true, title: true },
    });
    if (!deal) throw new NotFoundException("Negocio no encontrado.");
    return this.page(
      {
        activity: { dealId: id },
        note: { dealId: id },
        stage: { dealId: id },
        audit: { entityType: "Deal", entityId: id },
        deals: [deal],
      },
      cursor,
      query.limit,
    );
  }

  async forContact(id: string, actor: Actor, query: TimelineQueryDto) {
    const cursor = decodeCursor(query.cursor);
    const contact = await this.prisma.contact.findFirst({
      where: { id, ...ownerScope(actor) },
      select: { id: true },
    });
    if (!contact) throw new NotFoundException("Contacto no encontrado.");
    // VENDEDOR: solo los negocios del contacto que también son suyos.
    const deals = await this.prisma.deal.findMany({
      where: { contactId: id, ...ownerScope(actor) },
      select: { id: true, title: true },
    });
    const dealIds = deals.map((deal) => deal.id);
    const admin = actor.role === "ADMIN";
    // Lo del contacto sin negocio o con un negocio visible; más todo lo de sus negocios visibles.
    const own = admin
      ? { contactId: id }
      : { contactId: id, OR: [{ dealId: null }, { deal: { ownerId: actor.id } }] };
    const linked = { OR: [own, { dealId: { in: dealIds } }] };
    // Un negocio borrado desde la papelera deja su copia en la auditoría; VENDEDOR la ve si era suyo (las filas sin ownerId, solo ADMIN).
    const deleted: Prisma.AuditLogWhereInput = {
      action: "DELETED",
      AND: [
        { changes: { path: ["contactId"], equals: id } },
        ...(admin ? [] : [{ changes: { path: ["ownerId"], equals: actor.id } }]),
      ],
    };
    return this.page(
      {
        activity: linked,
        note: linked,
        stage: { dealId: { in: dealIds } },
        audit: { entityType: "Deal", OR: [{ entityId: { in: dealIds } }, deleted] },
        deals,
      },
      cursor,
      query.limit,
    );
  }

  /**
   * Una página por keyset: cada fuente trae sus `limit + 1` siguientes al cursor y se mezclan en memoria.
   * ponytail: lee hasta 4×(limit+1) filas por página; una vista SQL con UNION si las fuentes crecen mucho.
   * Los ids son cuid ([0-9a-z]): se comparan igual en JS y en Postgres, así el desempate coincide.
   */
  private async page(sources: Sources, cursor: Cursor | undefined, limit: number) {
    const take = limit + 1;
    const [activities, notes, moves, logs] = await Promise.all([
      this.prisma.activity.findMany({
        where: { AND: [sources.activity, keyset<Prisma.ActivityWhereInput>("ACTIVITY", "createdAt", cursor)] },
        include: { assignee: person, createdBy: person, deal: dealRef },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
      }),
      this.prisma.note.findMany({
        where: { AND: [sources.note, keyset<Prisma.NoteWhereInput>("NOTE", "createdAt", cursor)] },
        include: { author: person, deal: dealRef },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
      }),
      this.prisma.dealStageHistory.findMany({
        where: {
          AND: [sources.stage, keyset<Prisma.DealStageHistoryWhereInput>("STAGE", "changedAt", cursor)],
        },
        include: {
          fromStage: person,
          toStage: person,
          changedBy: person,
          deal: dealRef,
        },
        orderBy: [{ changedAt: "desc" }, { id: "desc" }],
        take,
      }),
      this.prisma.auditLog.findMany({
        where: { AND: [sources.audit, keyset<Prisma.AuditLogWhereInput>("EVENT", "createdAt", cursor)] },
        select: { id: true, action: true, changes: true, createdAt: true, entityId: true, user: person },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take,
      }),
    ]);
    const titles = new Map(sources.deals.map((deal) => [deal.id, deal]));
    const events = [
      ...activities.map(
        (a): TimelineEvent => ({
          id: `ACTIVITY:${a.id}`,
          kind: "ACTIVITY",
          at: a.createdAt,
          // Las anteriores a createdById no saben quién las registró: se muestra el responsable.
          author: a.createdBy ?? a.assignee,
          deal: a.deal,
          activity: {
            id: a.id,
            type: a.type,
            status: a.status,
            subject: a.subject,
            description: a.description,
            dueAt: a.dueAt,
            completedAt: a.completedAt,
            assignee: a.assignee,
          },
        }),
      ),
      ...notes.map(
        (n): TimelineEvent => ({
          id: `NOTE:${n.id}`,
          kind: "NOTE",
          at: n.createdAt,
          author: n.author,
          deal: n.deal,
          note: { id: n.id, content: n.content },
        }),
      ),
      ...moves.map(
        (m): TimelineEvent => ({
          id: `STAGE:${m.id}`,
          kind: "STAGE",
          at: m.changedAt,
          author: m.changedBy,
          deal: m.deal,
          stage: { from: m.fromStage, to: m.toStage, reason: m.reason },
        }),
      ),
      ...logs.map(
        (l): TimelineEvent => ({
          id: `EVENT:${l.id}`,
          kind: "EVENT",
          at: l.createdAt,
          author: l.user,
          // Un negocio borrado ya no está entre los visibles: queda sin enlace.
          deal: titles.get(l.entityId) ?? null,
          event: { action: l.action, changes: l.changes as Record<string, unknown> | null },
        }),
      ),
    ].sort(
      (a, b) =>
        b.at.getTime() - a.at.getTime() || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0),
    );
    const data = events.slice(0, limit);
    const last = data.at(-1);
    return {
      data,
      meta: { limit, nextCursor: events.length > limit && last ? encodeCursor(last) : null },
    };
  }
}

/**
 * Lo que viene después del cursor para una fuente de tipo `kind`. Los cuatro tipos no son prefijo
 * uno del otro, así que ordenar por `${kind}:${id}` es ordenar por tipo y luego por id.
 */
function keyset<W>(kind: Kind, field: "createdAt" | "changedAt", cursor?: Cursor): W {
  if (!cursor) return {} as W;
  if (kind !== cursor.kind)
    return { [field]: kind < cursor.kind ? { lte: cursor.at } : { lt: cursor.at } } as W;
  return {
    OR: [{ [field]: { lt: cursor.at } }, { [field]: cursor.at, id: { lt: cursor.id } }],
  } as W;
}

function encodeCursor(event: TimelineEvent) {
  return Buffer.from(JSON.stringify({ at: event.at.toISOString(), id: event.id })).toString(
    "base64url",
  );
}

function decodeCursor(raw?: string): Cursor | undefined {
  if (!raw) return undefined;
  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
  } catch {
    throw new BadRequestException(INVALID_CURSOR);
  }
  const { at, id } = (parsed ?? {}) as { at?: unknown; id?: unknown };
  const [kind = "", rawId = ""] = typeof id === "string" ? id.split(/:(.*)/s) : [];
  const date = typeof at === "string" ? new Date(at) : null;
  if (!KINDS.includes(kind as Kind) || !rawId || !date || Number.isNaN(date.getTime()))
    throw new BadRequestException(INVALID_CURSOR);
  return { at: date, kind: kind as Kind, id: rawId };
}
