import { Clock3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ESTADO_ACTIVIDAD, MOTIVO_CIERRE, TIPO_ACTIVIDAD } from "@/content/catalogos";
import { NEGOCIO, TABLERO } from "@/content/pipeline";
import { formatDateTime, formatDay, formatMoney } from "@/lib/format";
import { ActivityForm, CompleteButton } from "./activity-actions";
import type { Closure, DealDetail } from "./types";

type Entry = { id: string; at: string; title: string; detail: string; note?: string | null; pending?: { id: string; subject: string } };
const texto = NEGOCIO.timeline;
const notes = (...parts: (string | null | undefined | false)[]) => parts.filter(Boolean).join(" · ") || null;

/** Título y nota de cada evento del AuditLog: cierres, reapertura y propuestas. */
const EVENTS: Record<Closure["action"], (c: NonNullable<Closure["changes"]>) => [string, string | null]> = {
  WON: (c) => [texto.ganado(c.quoteNumber ?? ""), null],
  LOST: (c) => [
    texto.perdido(c.lossReason ? MOTIVO_CIERRE[c.lossReason] : ""),
    notes(c.lossDetail, c.followUpAt && texto.seguimiento(formatDay(c.followUpAt))),
  ],
  REJECTED: (c) => [
    texto.rechazado(c.lossReason ? MOTIVO_CIERRE[c.lossReason] : ""),
    notes(c.lossDetail, c.quotes && texto.invalidado(c.quotes.length, c.cancelledActivities ?? 0)),
  ],
  REOPENED: (c) => [texto.reabierto, c.reason ? TABLERO.motivo(c.reason) : null],
  QUOTE_SENT: (c) => [
    texto.propuestaEnviada(c.quoteNumber ?? "", formatMoney(c.total ?? 0)),
    c.validUntil ? texto.vigencia(formatDay(c.validUntil)) : null,
  ],
  QUOTE_ACCEPTED: (c) => [texto.propuestaAceptada(c.quoteNumber ?? ""), c.acceptanceNote ?? null],
  QUOTE_SUPERSEDED: (c) => [texto.propuestaDesactualizada(c.quoteNumber ?? ""), null],
};

/** Actividades, cambios de etapa y cierres en una sola línea de tiempo, del más reciente al más antiguo. */
function entries(deal: DealDetail): Entry[] {
  const who = (user: { name: string } | null) => user?.name ?? texto.sistema;
  return [
    ...deal.activities.map((activity) => ({
      id: "a-" + activity.id,
      at: activity.completedAt ?? activity.dueAt ?? activity.createdAt,
      title: `${TIPO_ACTIVIDAD[activity.type]} · ${activity.subject}`,
      detail: [
        ESTADO_ACTIVIDAD[activity.status],
        who(activity.assignee),
        activity.dueAt && formatDay(activity.dueAt),
      ]
        .filter(Boolean)
        .join(" · "),
      note: activity.description,
      pending: activity.status === "PENDING" ? { id: activity.id, subject: activity.subject } : undefined,
    })),
    ...deal.stageHistory.map((move) => ({
      id: "h-" + move.id,
      at: move.changedAt,
      title: move.fromStage ? texto.movido(move.fromStage.name, move.toStage.name) : texto.creado(move.toStage.name),
      detail: `${who(move.changedBy)} · ${formatDateTime(move.changedAt)}`,
      note: move.reason && TABLERO.motivo(move.reason),
    })),
    // Una acción que esta versión no conoce no rompe la ficha: se omite.
    ...deal.closures.filter((closure) => closure.action in EVENTS).map((closure) => {
      const [title, note] = EVENTS[closure.action](closure.changes ?? {});
      return {
        id: "c-" + closure.id,
        at: closure.createdAt,
        title,
        detail: `${who(closure.user)} · ${formatDateTime(closure.createdAt)}`,
        note,
      };
    }),
  ].sort((a, b) => b.at.localeCompare(a.at));
}

export function DealTimeline({ deal }: Readonly<{ deal: DealDetail }>) {
  const list = entries(deal);
  return (
    <Card className="contact-related deal-timeline">
      <h3>
        <Clock3 aria-hidden />
        {texto.titulo}
      </h3>
      {/* Un rechazado no admite actividades nuevas (409 del API) hasta reabrirlo. */}
      {deal.status !== "REJECTED" && <ActivityForm dealId={deal.id} />}
      {list.length ? (
        <ol>
          {list.map((entry) => (
            <li key={entry.id}>
              <div>
                <strong>{entry.title}</strong>
                <span>{entry.detail}</span>
                {entry.note && <p>{entry.note}</p>}
              </div>
              {entry.pending && <CompleteButton dealId={deal.id} activity={entry.pending} />}
            </li>
          ))}
        </ol>
      ) : (
        <p>{texto.vacio}</p>
      )}
    </Card>
  );
}
