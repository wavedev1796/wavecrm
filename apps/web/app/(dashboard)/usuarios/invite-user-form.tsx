"use client";

import { MailPlus } from "lucide-react";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, invalidProps } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ROL_USUARIO } from "@/content/catalogos";
import { USUARIOS } from "@/content/usuarios";
import { EMAIL_MAX, NAME_MAX } from "@/lib/validation";
import { inviteUser, type UserFormState } from "./actions";
import { useShowFeedback } from "./users-feedback";

const texto = USUARIOS.invitar;

const initialState: UserFormState = {
  feedback: null,
  fieldErrors: {},
  values: { name: "", email: "", role: "VENDEDOR" },
};

export function InviteUserForm() {
  const show = useShowFeedback();
  const [state, formAction, pending] = useActionState(
    async (previous: UserFormState, formData: FormData) => {
      const next = await inviteUser(previous, formData);
      if (next.feedback?.tone === "success") show(next.feedback);
      return next;
    },
    initialState,
  );
  const { fieldErrors, values } = state;

  return (
    <>
      {/* Fuera de la grilla de 4 columnas del formulario para no descuadrar los campos. */}
      {state.feedback?.tone === "error" && <Alert tone="error">{state.feedback.message}</Alert>}
      <form action={formAction} className="user-form" noValidate aria-busy={pending || undefined}>
        <div className="form-field">
          <label>
            {texto.nombre}
            <Input
              name="name"
              required
              maxLength={NAME_MAX}
              placeholder={texto.nombrePlaceholder}
              defaultValue={values.name}
              {...invalidProps("invite-name", fieldErrors.name)}
            />
          </label>
          <FieldError id="invite-name" message={fieldErrors.name} />
        </div>
        <div className="form-field">
          <label>
            {texto.correo}
            <Input
              name="email"
              type="email"
              required
              maxLength={EMAIL_MAX}
              placeholder={texto.correoPlaceholder}
              defaultValue={values.email}
              {...invalidProps("invite-email", fieldErrors.email)}
            />
          </label>
          <FieldError id="invite-email" message={fieldErrors.email} />
        </div>
        <div className="form-field">
          <label>
            {texto.rol}{' '}
            <Select name="role" defaultValue={values.role} {...invalidProps("invite-role", fieldErrors.role)}>
              <option value="VENDEDOR">{ROL_USUARIO.VENDEDOR}</option>
              <option value="ADMIN">{ROL_USUARIO.ADMIN}</option>
            </Select>
          </label>
          <FieldError id="invite-role" message={fieldErrors.role} />
        </div>
        <Button type="submit" loading={pending}>
          <MailPlus />
          {texto.enviar}
        </Button>
      </form>
    </>
  );
}
