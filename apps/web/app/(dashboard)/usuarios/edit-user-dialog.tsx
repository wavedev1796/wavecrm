"use client";

import { Check, Pencil, X } from "lucide-react";
import { useActionState, useRef } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, invalidProps } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { EMAIL_MAX, NAME_MAX } from "@/lib/validation";
import { updateUser, type UserFormState } from "./actions";
import { useShowFeedback } from "./users-feedback";

type EditableUser = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "VENDEDOR";
};

export function EditUserDialog({ user }: Readonly<{ user: EditableUser }>) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const show = useShowFeedback();
  const [state, formAction, pending] = useActionState(
    async (previous: UserFormState, formData: FormData) => {
      const next = await updateUser(previous, formData);
      if (next.feedback?.tone === "success") {
        dialogRef.current?.close();
        show(next.feedback);
      }
      return next;
    },
    { feedback: null, fieldErrors: {}, values: { name: user.name, email: user.email, role: user.role } },
  );
  const { fieldErrors, values } = state;
  const titleId = `edit-user-title-${user.id}`;
  const fieldId = (name: string) => `edit-${user.id}-${name}`;

  return (
    <>
      <button
        type="button"
        className="icon-button"
        title="Editar"
        onClick={() => dialogRef.current?.showModal()}
      >
        <Pencil aria-hidden />
        <span className="sr-only">Editar {user.name}</span>
      </button>

      <dialog
        ref={dialogRef}
        className="user-dialog"
        aria-labelledby={titleId}
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close();
        }}
      >
        <div className="user-dialog-card">
          <header>
            <div>
              <span>Administración de usuarios</span>
              <h2 id={titleId}>Editar usuario</h2>
              <p>Actualiza sus datos y el nivel de acceso al CRM.</p>
            </div>
            <button
              type="button"
              className="icon-button"
              aria-label="Cerrar"
              onClick={() => dialogRef.current?.close()}
            >
              <X aria-hidden />
            </button>
          </header>

          <form action={formAction} className="edit-user-form" noValidate aria-busy={pending || undefined}>
            <input type="hidden" name="id" value={user.id} />
            <div className="edit-user-fields">
              {state.feedback?.tone === "error" && <Alert tone="error">{state.feedback.message}</Alert>}
              <div className="form-field">
                <label>
                  Nombre completo
                  <Input
                    name="name"
                    required
                    maxLength={NAME_MAX}
                    defaultValue={values.name}
                    {...invalidProps(fieldId("name"), fieldErrors.name)}
                  />
                </label>
                <FieldError id={fieldId("name")} message={fieldErrors.name} />
              </div>
              <div className="form-field">
                <label>
                  Correo electrónico
                  <Input
                    name="email"
                    type="email"
                    required
                    maxLength={EMAIL_MAX}
                    defaultValue={values.email}
                    {...invalidProps(fieldId("email"), fieldErrors.email)}
                  />
                </label>
                <FieldError id={fieldId("email")} message={fieldErrors.email} />
              </div>
              <div className="form-field">
                <label>
                  Rol y permisos{' '}
                  <select
                    name="role"
                    defaultValue={values.role}
                    {...invalidProps(fieldId("role"), fieldErrors.role)}
                  >
                    <option value="VENDEDOR">Vendedor</option>
                    <option value="ADMIN">Administrador</option>
                  </select>
                  <small>
                    Los administradores pueden gestionar usuarios, roles y
                    accesos.
                  </small>
                </label>
                <FieldError id={fieldId("role")} message={fieldErrors.role} />
              </div>
            </div>
            <footer>
              <Button
                type="button"
                variant="secondary"
                onClick={() => dialogRef.current?.close()}
              >
                Cancelar
              </Button>
              <Button type="submit" className="edit-user-submit" loading={pending}>
                <Check aria-hidden />
                Aplicar cambios
              </Button>
            </footer>
          </form>
        </div>
      </dialog>
    </>
  );
}
