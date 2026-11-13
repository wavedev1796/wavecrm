import type { ActivityStatus, ActivityType, DealStatus, LossReason } from "@wave/shared";

type Ref = { id: string; name: string };

/** Evento de `GET /deals|contacts/:id/timeline`, ya ordenado por el API (el más reciente primero). */
export type TimelineEvent = {
  id: string;
  kind: "ACTIVITY" | "EVENT" | "NOTE" | "STAGE";
  at: string;
  author: Ref | null;
  /** null: evento solo del contacto, o de un negocio ya eliminado. */
  deal: { id: string; title: string } | null;
  activity?: {
    id: string;
    type: ActivityType;
    status: ActivityStatus;
    subject: string;
    description: string | null;
    dueAt: string | null;
    completedAt: string | null;
    assignee: Ref | null;
  };
  /** `canEdit`: quien mira es el autor o un ADMIN. */
  note?: { id: string; content: string; mentions: Ref[]; editedAt: string | null; canEdit: boolean };
  stage?: { from: Ref | null; to: Ref; reason: string | null };
  event?: {
    action: string;
    entityType?: string;
    changes: Record<string, unknown> | null;
    activitySubject?: string;
  };
};
export type TimelineApiPage = { data: TimelineEvent[]; meta: { limit: number; nextCursor: string | null } };

/** Lo que guarda cada evento del AuditLog en `changes`: cierres, reapertura, propuestas y borrado. */
export type EventChanges = {
  quoteNumber?: string | null;
  lossReason?: LossReason | null;
  lossDetail?: string | null;
  from?: DealStatus;
  reason?: string | null;
  total?: string;
  validUntil?: string;
  acceptanceNote?: string;
  followUpAt?: string | null;
  quotes?: string[];
  cancelledActivities?: number;
  title?: string;
};

/** Evento armado en el servidor: textos y fechas ya formateados, listos para pintar. */
export type TimelineEntry = {
  id: string;
  type: string;
  title: string;
  detail: string;
  note: string | null;
  deal: { id: string; title: string } | null;
  pending?: { id: string; subject: string };
  /** Nota que quien mira puede editar o eliminar, con su texto y menciones actuales. */
  editable?: EditableNote;
};
export type EditableNote = { id: string; content: string; mentionIds: string[] };
/** Miembro activo que se puede mencionar (`GET /pipeline/owners`). */
export type Member = { id: string; name: string };
/** Formulario de nota: lo escrito vuelve siempre, así un fallo no lo borra. */
export type NoteFormState = {
  content: string;
  mentionIds: string[];
  fieldErrors?: { content?: string };
  error?: string;
  saved?: true;
};
/** Una página del historial, o por qué no se pudo leer (`forbidden`: el API respondió 404). */
export type TimelineResult =
  | { entries: TimelineEntry[]; nextCursor: string | null }
  | { error: string; forbidden?: true };
