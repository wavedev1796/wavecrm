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
  WON: (c) => [texto.ganado(c.quoteNumber ?? ""), null],
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

function toEntry(event: TimelineEvent): TimelineEntry | null {
  const by = `${event.author?.name ?? texto.sistema} · ${formatDateTime(event.at)}`;
  const base = { id: event.id, deal: event.deal, detail: by };
  const { activity, note, stage } = event;
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
  if (event.kind === "NOTE" && note) return { ...base, type: texto.tipos.NOTE, title: texto.nota, note: note.content };
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
