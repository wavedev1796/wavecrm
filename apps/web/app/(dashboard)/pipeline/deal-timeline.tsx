"use client";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Clock3 } from "lucide-react";
import { ACTIVITY_TYPES } from "@wave/shared";
import { Field } from "@/components/form-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { invalidProps } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useFieldErrors } from "@/components/use-field-errors";
import { ESTADO_ACTIVIDAD, MOTIVO_PERDIDA, TIPO_ACTIVIDAD } from "@/content/catalogos";
import { NEGOCIO } from "@/content/pipeline";
import { formatDateTime, formatDay } from "@/lib/format";
import { completeActivityAction, createActivityAction } from "./actions";
import { emptyActivity, type ActivityValues, type Closure, type DealDetail } from "./types";

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
    })),
    ...deal.closures.map((closure) => ({
      id: "c-" + closure.id,
      at: closure.createdAt,
      title: closureTitle(closure),
      detail: `${who(closure.user)} · ${formatDateTime(closure.createdAt)}`,
      note: closure.changes?.lossDetail,
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

function CompleteButton({ dealId, activity }: Readonly<{ dealId: string; activity: { id: string; subject: string } }>) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  return (
    <>
      <Button
        variant="ghost"
        loading={pending}
        aria-label={texto.completarDe(activity.subject)}
        onClick={() =>
          startTransition(async () => {
            const result = await completeActivityAction(dealId, activity.id);
            if (result.error) setError(result.error);
            else router.refresh();
          })
        }
      >
        <Check aria-hidden />
        {texto.completar}
      </Button>
      {error && <Alert tone="error">{error}</Alert>}
    </>
  );
}

function ActivityForm({ dealId }: Readonly<{ dealId: string }>) {
  const t = NEGOCIO.actividad;
  const [state, action, pending] = useActionState(createActivityAction.bind(null, dealId), {
    values: emptyActivity,
    fieldErrors: {},
  });
  const { formRef, error, onChange } = useFieldErrors(state.fieldErrors);
  const props = (name: keyof ActivityValues) => ({
    id: "activity-" + name,
    name,
    defaultValue: state.values[name],
    ...invalidProps("activity-" + name, error(name)),
  });
  return (
    <form ref={formRef} action={action} onChange={onChange} className="activity-form" noValidate aria-busy={pending}>
      <h4>{t.titulo}</h4>
      {state.feedback && <Alert tone={state.feedback.tone}>{state.feedback.message}</Alert>}
      <Field id="activity-type" label={t.tipo} required error={error("type")}>
        <Select {...props("type")} required>
          {ACTIVITY_TYPES.map((type) => (
            <option key={type} value={type}>
              {TIPO_ACTIVIDAD[type]}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="activity-subject" label={t.asunto} required error={error("subject")}>
        <Input {...props("subject")} required maxLength={160} />
      </Field>
      <Field id="activity-dueAt" label={t.fecha} error={error("dueAt")}>
        <Input {...props("dueAt")} type="date" />
      </Field>
      <Field id="activity-description" label={t.nota} error={error("description")}>
        <Input {...props("description")} maxLength={1000} />
      </Field>
      <Button type="submit" loading={pending}>
        {t.guardar}
      </Button>
    </form>
  );
}
