"use client";

import { useId, useState, type FormEvent } from "react";
import { Activity, Check, Pencil, Plus, X, type LucideIcon } from "lucide-react";
import { Field } from "@/components/form/form-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ACTIVIDADES } from "@/content/actividades";
import { TIPO_ACTIVIDAD } from "@/content/catalogos";
import { inputDate } from "./dates";

export type Owner = { id: string; name: string };
type FieldName = "type" | "subject" | "assigneeId" | "dueAt" | "reminderAt" | "description";
/** Lo que devuelve la acción que guarda: la agenda (`saveActivity`) o la ficha (`createActivityAction`). */
export type ActivityResult = {
  ok: boolean;
  message: string;
  conflict?: boolean;
  fieldErrors?: Partial<Record<FieldName, string>>;
};
/** Datos para editar (agenda) o valores por defecto (ficha: responsable del negocio). */
export type ActivityDefaults = {
  updatedAt?: string;
  type?: string;
  subject?: string;
  description?: string | null;
  dueAt?: string | null;
  reminderAt?: string | null;
  assigneeId?: string | null;
};

const texto = ACTIVIDADES.formulario;

/**
 * «Registrar actividad»: el mismo diálogo en la agenda y en la ficha del negocio (P14, 2026-11-11).
 * Quien lo usa decide a qué ruta del API va (`onSubmit`); en la ficha, `withDone` suma la casilla «Ya se realizó».
 * Se envía con onSubmit y no con `action`: así un error no vacía lo escrito.
 */
export function ActivityDialog({
  mode = "create",
  owners,
  activity,
  withDone = false,
  inlineErrors = false,
  onSubmit,
  onClose,
}: Readonly<{
  mode?: "create" | "edit";
  owners: Owner[];
  activity?: ActivityDefaults;
  withDone?: boolean;
  /** Muestra el error del API dentro del diálogo. La agenda no lo usa: allá lo muestra su aviso emergente. */
  inlineErrors?: boolean;
  onSubmit: (data: FormData) => Promise<ActivityResult>;
  onClose: () => void;
}>) {
  const prefix = useId();
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<ActivityResult["fieldErrors"]>({});
  const [error, setError] = useState("");
  const editing = mode === "edit";
  // Los mismos iconos que tenía la agenda: Pencil/Check al editar, Activity/Plus al registrar.
  const HeaderIcon: LucideIcon = editing ? Pencil : Activity;
  const Icon: LucideIcon = editing ? Check : Plus;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await onSubmit(new FormData(event.currentTarget));
      setErrors(result.fieldErrors ?? {});
      setError(result.ok || result.fieldErrors ? "" : result.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div
      className="activity-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="activity-dialog card" role="dialog" aria-modal="true" aria-labelledby={prefix + "-title"}>
        <header>
          <div className="activity-dialog-icon">
            <HeaderIcon aria-hidden />
          </div>
          <div>
            <h2 id={prefix + "-title"}>{editing ? texto.editar : texto.registrar}</h2>
            <p>{editing ? texto.editarAyuda : texto.registrarAyuda}</p>
          </div>
          <button type="button" aria-label={texto.cerrar} onClick={onClose}>
            <X aria-hidden />
          </button>
        </header>
        <form onSubmit={submit} aria-busy={saving}>
          {inlineErrors && error && <Alert tone="error">{error}</Alert>}
          <ActivityFields prefix={prefix} owners={owners} activity={activity} withDone={withDone} errors={errors ?? {}} />
          <footer>
            <Button type="button" variant="secondary" onClick={onClose}>
              {ACTIVIDADES.cancelar}
            </Button>
            <Button type="submit" disabled={saving} className="action-button action-button--success">
              <Icon aria-hidden />
              {saving ? texto.guardando : editing ? texto.guardarCambios : texto.guardar}
            </Button>
          </footer>
        </form>
      </section>
    </div>
  );
}

function ActivityFields({
  prefix,
  owners,
  activity,
  withDone,
  errors,
}: Readonly<{
  prefix: string;
  owners: Owner[];
  activity?: ActivityDefaults;
  withDone: boolean;
  errors: NonNullable<ActivityResult["fieldErrors"]>;
}>) {
  const id = (name: string) => `${prefix}-${name}`;
  const campos = texto.campos;
  // Los nombres accesibles «Tipo de actividad» y «Responsable asignado» se conservan (los usa el E2E de la agenda).
  return (
    <div className="activity-form-grid">
      {activity?.updatedAt && <input type="hidden" name="updatedAt" value={activity.updatedAt} />}
      <Field id={id("subject")} label={campos.asunto} icon="asunto" required error={errors.subject}>
        <Input id={id("subject")} name="subject" defaultValue={activity?.subject} required minLength={2} maxLength={160} />
      </Field>
      <Field id={id("type")} label={campos.tipo} icon="tipo" required error={errors.type}>
        <Select id={id("type")} name="type" aria-label={campos.tipoNombre} defaultValue={activity?.type ?? "TASK"}>
          {Object.entries(TIPO_ACTIVIDAD).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <Field id={id("assigneeId")} label={campos.responsable} icon="responsable" required error={errors.assigneeId}>
        <Select
          id={id("assigneeId")}
          name="assigneeId"
          aria-label={campos.responsableNombre}
          defaultValue={activity?.assigneeId ?? owners[0]?.id ?? ""}
          required
        >
          {owners.map((owner) => (
            <option key={owner.id} value={owner.id}>
              {owner.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field id={id("dueAt")} label={campos.vence} icon="fecha" error={errors.dueAt}>
        <Input id={id("dueAt")} name="dueAt" type="datetime-local" defaultValue={inputDate(activity?.dueAt)} />
      </Field>
      <Field id={id("reminderAt")} label={campos.recordatorio} icon="recordatorio" error={errors.reminderAt}>
        <Input id={id("reminderAt")} name="reminderAt" type="datetime-local" defaultValue={inputDate(activity?.reminderAt)} />
      </Field>
      {withDone && (
        <div className="activity-done-field">
          <label className="activity-done">
            <input type="checkbox" name="done" aria-describedby={id("done-hint")} />
            {campos.hecha}
          </label>
          <p id={id("done-hint")} className="field-hint">
            {texto.hechaAyuda}
          </p>
        </div>
      )}
      <div className="activity-description">
        <Field id={id("description")} label={campos.descripcion} icon="texto" error={errors.description}>
          <textarea
            id={id("description")}
            name="description"
            defaultValue={activity?.description ?? ""}
            maxLength={1000}
          />
        </Field>
      </div>
    </div>
  );
}
