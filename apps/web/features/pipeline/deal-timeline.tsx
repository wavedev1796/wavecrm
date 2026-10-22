import { Clock3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { ESTADO_ACTIVIDAD, MOTIVO_PERDIDA, TIPO_ACTIVIDAD } from "@/content/catalogos";
import { NEGOCIO, TABLERO } from "@/content/pipeline";
import { formatDateTime, formatDay } from "@/lib/format";
import { ActivityForm, CompleteButton } from "./activity-actions";
import type { Closure, DealDetail } from "./types";

type Entry = { id: string; at: string; title: string; detail: string; note?: string | null; pending?: { id: string; subject: string } };
const texto = NEGOCIO.timeline;

function closureTitle(closure: Closure) {
  if (closure.action === "WON") return texto.ganado(closure.changes?.quoteNumber ?? "");
  if (closure.action === "LOST")
    return texto.perdido(closure.changes?.lossReason ? MOTIVO_PERDIDA[closure.changes.lossReason] : "");
  return texto.reabierto;
}

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
    ...deal.closures.map((closure) => ({
      id: "c-" + closure.id,
      at: closure.createdAt,
      title: closureTitle(closure),
      detail: `${who(closure.user)} · ${formatDateTime(closure.createdAt)}`,
      note: closure.changes?.reason ? TABLERO.motivo(closure.changes.reason) : closure.changes?.lossDetail,
    })),
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
      <ActivityForm dealId={deal.id} />
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
