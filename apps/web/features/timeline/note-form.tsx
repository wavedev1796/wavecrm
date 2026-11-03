"use client";
import { useActionState, useState, useTransition } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Field } from "@/components/form/form-field";
import { useFieldErrors } from "@/components/form/use-field-errors";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { invalidProps } from "@/components/ui/field-error";
import { TIMELINE } from "@/content/timeline";
import { createNote, deleteNote, updateNote } from "./note-actions";
import type { EditableNote, Member, NoteFormState } from "./types";

const texto = TIMELINE.notas;
const EMPTY: NoteFormState = { content: "", mentionIds: [] };
// Misma referencia mientras no haya un envío nuevo: useFieldErrors compara por identidad.
const NO_ERRORS: NonNullable<NoteFormState["fieldErrors"]> = {};

/** Texto (sin HTML: se guarda y se pinta como texto plano) y casillas de miembros para mencionar. */
function NoteFields({
  prefix,
  state,
  error,
  members,
}: Readonly<{ prefix: string; state: NoteFormState; error?: string; members: Member[] }>) {
  const id = prefix + "-content";
  return (
    <>
      <Field id={id} label={texto.texto} required error={error}>
        <textarea
          id={id}
          name="content"
          className="input deal-textarea"
          required
          maxLength={5000}
          defaultValue={state.content}
          {...invalidProps(id, error)}
        />
      </Field>
      {members.length > 0 && (
        <fieldset className="note-mentions">
          <legend>{texto.mencionar}</legend>
          <p>{texto.mencionarAyuda}</p>
          {members.map((member) => (
            <label key={member.id}>
              <input
                type="checkbox"
                name="mentionIds"
                value={member.id}
                defaultChecked={state.mentionIds.includes(member.id)}
              />
              {member.name}
            </label>
          ))}
        </fieldset>
      )}
    </>
  );
}

export function NoteForm({
  kind,
  id,
  members,
}: Readonly<{ kind: "deals" | "contacts"; id: string; members: Member[] }>) {
  const [state, action, pending] = useActionState(createNote.bind(null, kind, id), EMPTY);
  const { formRef, error, onChange } = useFieldErrors(state.fieldErrors ?? NO_ERRORS);
  return (
    <form ref={formRef} action={action} onChange={onChange} className="note-form" noValidate aria-busy={pending}>
      <h4>{texto.titulo}</h4>
      {state.saved && <Alert tone="success">{texto.guardada}</Alert>}
      {state.error && <Alert tone="error">{state.error}</Alert>}
      <NoteFields prefix="note-new" state={state} error={error("content")} members={members} />
      <Button type="submit" loading={pending}>
        {texto.guardar}
      </Button>
    </form>
  );
}

/** Editar o eliminar una nota desde el historial: solo aparece si quien mira es su autor o un ADMIN. */
export function NoteControls({ note, members }: Readonly<{ note: EditableNote; members: Member[] }>) {
  const [editing, setEditing] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, startDelete] = useTransition();
  // La acción de servidor va directa (como en NoteForm): envuelta en una función propia, el historial no se refrescaba.
  const [state, action, pending] = useActionState(updateNote.bind(null, note.id), note);
  const { formRef, error, onChange } = useFieldErrors(state.fieldErrors ?? NO_ERRORS);
  // Guardado: se cierra el editor al recibir la respuesta (no dentro de la acción).
  const [handled, setHandled] = useState(state);
  if (handled !== state) {
    setHandled(state);
    if (state.saved) setEditing(false);
  }

  if (editing)
    return (
      <form ref={formRef} action={action} onChange={onChange} className="note-form" noValidate aria-busy={pending}>
        {state.error && <Alert tone="error">{state.error}</Alert>}
        <NoteFields prefix={"note-" + note.id} state={state} error={error("content")} members={members} />
        <div className="note-actions">
          <Button type="submit" loading={pending}>
            {texto.guardarCambios}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
            {texto.cancelar}
          </Button>
        </div>
      </form>
    );
  const remove = () => {
    if (!window.confirm(texto.confirmarEliminar)) return;
    startDelete(async () => {
      const result = await deleteNote(note.id);
      setDeleteError(result.error ?? "");
    });
  };
  return (
    <div className="note-actions">
      {state.saved && <Alert tone="success">{texto.actualizada}</Alert>}
      <Button type="button" variant="ghost" aria-label={texto.editarNota} onClick={() => setEditing(true)}>
        <Pencil aria-hidden />
        {texto.editar}
      </Button>
      <Button type="button" variant="ghost" loading={deleting} aria-label={texto.eliminarNota} onClick={remove}>
        <Trash2 aria-hidden />
        {texto.eliminar}
      </Button>
      {deleteError && <Alert tone="error">{deleteError}</Alert>}
    </div>
  );
}
