import { ESTADO_ACTIVIDAD, MOTIVO_CIERRE, TIPO_ACTIVIDAD } from "@/content/catalogos";
import { TABLERO } from "@/content/pipeline";
import { TIMELINE } from "@/content/timeline";
import { formatDate, formatDateTime, formatDay, formatMoney } from "@/lib/format";
import type { EventChanges, TimelineEntry, TimelineEvent } from "./types";

// Se arma solo en el servidor (la página y loadTimeline): las fechas salen formateadas una vez y no
// difieren entre el ICU de Node y el del navegador al hidratar.

const texto = TIMELINE;
const notes = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(" · ") || null;
const reason = (value: string | null | undefined) => (value ? TABLERO.motivo(value) : null);

/** Título y nota de cada evento del AuditLog: cierres, reapertura, propuestas y borrado. */
const EVENTS: Record<string, (c: EventChanges) => [string, string | null]> = {
  WON: (c) => [texto.ganado(c.quoteNumber ?? ""), c.paymentConfirmed ? texto.pagoComprobado : null],
  PAYMENT_ADDED: (c) => [texto.abonoRegistrado(formatMoney(c.amount ?? 0)), notes(c.paidAt && texto.pagadoEl(formatDay(c.paidAt)), c.note)],
  PAYMENT_DELETED: (c) => [texto.abonoBorrado(formatMoney(c.amount ?? 0)), notes(c.paidAt && texto.pagadoEl(formatDay(c.paidAt)), c.note)],
  LOST: (c) => [
    texto.perdido(c.lossReason ? MOTIVO_CIERRE[c.lossReason] : ""),
    notes(c.lossDetail, c.followUpAt && texto.seguimiento(formatDay(c.followUpAt))),
  ],
  REJECTED: (c) => [
    texto.rechazado(c.lossReason ? MOTIVO_CIERRE[c.lossReason] : ""),
    notes(c.lossDetail, c.quotes && texto.invalidado(c.quotes.length, c.cancelledActivities ?? 0)),
  ],
  REOPENED: (c) => [texto.reabierto, reason(c.reason)],
  QUOTE_SENT: (c) => [
    texto.propuestaEnviada(c.quoteNumber ?? "", formatMoney(c.total ?? 0)),
    c.validUntil ? texto.vigencia(formatDay(c.validUntil)) : null,
  ],
  QUOTE_ACCEPTED: (c) => [texto.propuestaAceptada(c.quoteNumber ?? ""), c.acceptanceNote ?? null],
  QUOTE_SUPERSEDED: (c) => [texto.propuestaDesactualizada(c.quoteNumber ?? ""), null],
  // Borrado desde la papelera: el AuditLog guarda una copia del negocio rechazado, con su motivo.
  DELETED: (c) => [texto.eliminado(c.title ?? ""), notes(reason(c.lossReason && MOTIVO_CIERRE[c.lossReason]), c.lossDetail)],
};

export function describeActivityChanges(changes: Record<string, unknown> | null) {
  if (!changes) return null;
  const details = Object.entries(changes).flatMap(([key, raw]) => {
    const label = texto.actividades.cambios[key];
    if (!label || !raw || typeof raw !== "object") return [];
    const values = raw as { from?: unknown; to?: unknown };
    if (key === "subject")
      return [`${label}: ${String(values.from ?? "Sin asunto")} → ${String(values.to ?? "Sin asunto")}`];
    if (key === "status") {
      const from = typeof values.from === "string" && values.from in ESTADO_ACTIVIDAD
        ? ESTADO_ACTIVIDAD[values.from as keyof typeof ESTADO_ACTIVIDAD]
        : String(values.from ?? "");
      const to = typeof values.to === "string" && values.to in ESTADO_ACTIVIDAD
        ? ESTADO_ACTIVIDAD[values.to as keyof typeof ESTADO_ACTIVIDAD]
        : String(values.to ?? "");
      return [`${label}: ${from} → ${to}`];
    }
    if (key === "dueAt" || key === "reminderAt") {
      const from = typeof values.from === "string" ? formatDateTime(values.from) : "Sin fecha";
      const to = typeof values.to === "string" ? formatDateTime(values.to) : "Sin fecha";
      return [`${label}: ${from} → ${to}`];
    }
    return [`${label} actualizado`];
  });
  return details.length ? details.join(" · ") : null;
}

function toEntry(event: TimelineEvent): TimelineEntry | null {
  const by = `${event.author?.name ?? texto.sistema} · ${formatDateTime(event.at)}`;
  const base = { id: event.id, deal: event.deal, detail: by };
  const { activity, note, stage } = event;
  if (event.kind === "EVENT" && event.event?.entityType === "Activity") {
    const titles: Record<string, string> = {
      UPDATED: texto.actividades.actualizada,
      COMPLETED: texto.actividades.completada,
      CANCELLED: texto.actividades.cancelada,
      DELETED: texto.actividades.eliminada,
    };
    const label = titles[event.event.action];
    if (!label) return null;
    return {
      ...base,
      type: texto.tipos.ACTIVITY_EVENT,
      title: `${label}: ${event.event.activitySubject || texto.actividades.sinAsunto}`,
      note: describeActivityChanges(event.event.changes),
    };
  }
  if (event.kind === "ACTIVITY" && activity)
    return {
      ...base,
      type: TIPO_ACTIVIDAD[activity.type],
      title: activity.subject,
      detail: [
        ESTADO_ACTIVIDAD[activity.status],
        by,
        // dueAt es un instante (un día sin hora es 00:00 de Ecuador): se pinta en zona Ecuador, como la agenda.
        activity.status === "PENDING" && activity.dueAt && texto.vence(formatDate(activity.dueAt)),
      ]
        .filter(Boolean)
        .join(" · "),
      note: activity.description,
      ...(activity.status === "PENDING" && { pending: { id: activity.id, subject: activity.subject } }),
    };

  if (event.kind === "NOTE" && note)
    return {
      ...base,
      type: texto.tipos.NOTE,
      title: texto.nota,
      detail: [
        by,
        note.editedAt && texto.editada,
        note.mentions.length > 0 && texto.menciona(note.mentions.map((m) => m.name).join(", ")),
      ]
        .filter(Boolean)
        .join(" · "),
      note: note.content,
      ...(note.canEdit && {
        editable: { id: note.id, content: note.content, mentionIds: note.mentions.map((m) => m.id) },
      }),
    };
  if (event.kind === "STAGE" && stage)
    return {
      ...base,
      type: texto.tipos.STAGE,
      title: stage.from ? texto.movido(stage.from.name, stage.to.name) : texto.creado(stage.to.name),
      note: reason(stage.reason),
    };
  // Una acción o un tipo que esta versión no conoce no rompe la ficha: se omite.
  const build = event.kind === "EVENT" && event.event && Object.hasOwn(EVENTS, event.event.action) && EVENTS[event.event.action];
  if (!build) return null;
  const [title, extra] = build((event.event?.changes ?? {}) as EventChanges);
  return { ...base, type: texto.tipos.EVENT, title, note: extra };
}

/** Eventos del API en el orden en que llegan, listos para la lista. */
export const toEntries = (events: TimelineEvent[]): TimelineEntry[] =>
  events.map(toEntry).filter((entry): entry is TimelineEntry => entry !== null);
