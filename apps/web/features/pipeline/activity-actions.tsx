"use client";
import { useActionState, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { ACTIVITY_TYPES } from "@wave/shared";
import { Field } from "@/components/form/form-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { invalidProps } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { useFieldErrors } from "@/components/form/use-field-errors";
import { TIPO_ACTIVIDAD } from "@/content/catalogos";
import { NEGOCIO } from "@/content/pipeline";
import { completeActivityAction, createActivityAction } from "./actions";
import { emptyActivity, type ActivityValues } from "./types";

// Las partes interactivas del timeline. La lista vive en el servidor (deal-timeline.tsx): así las fechas
// se formatean una sola vez y no difieren entre el ICU de Node y el del navegador al hidratar.

export function CompleteButton({ dealId, activity }: Readonly<{ dealId: string; activity: { id: string; subject: string } }>) {
  const texto = NEGOCIO.timeline;
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

export function ActivityForm({ dealId }: Readonly<{ dealId: string }>) {
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
      {/* Con la casilla, la fecha es la de la actividad hecha (la primera interacción, por ejemplo). */}
      <label className="activity-done">
        <input type="checkbox" name="done" defaultChecked={state.values.done === "on"} />
        {t.hecha}
      </label>
      <Button type="submit" loading={pending}>
        {t.guardar}
      </Button>
    </form>
  );
}
