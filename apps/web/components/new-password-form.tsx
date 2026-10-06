"use client";

import { Circle, CircleCheck } from "lucide-react";
import { type ReactNode, useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, invalidProps } from "@/components/ui/field-error";
import { PasswordInput } from "@/components/ui/password-input";
import { ACCESO } from "@/content/acceso";
import {
  confirmationError,
  PASSWORD_MAX,
  passwordChecks,
  type NewPasswordState,
} from "@/lib/password-rules";

const initialState: NewPasswordState = { error: null, fieldErrors: {} };

type Props = Readonly<{
  token: string;
  action: (state: NewPasswordState, formData: FormData) => Promise<NewPasswordState>;
  submitLabel: string;
  pendingLabel: string;
  children?: ReactNode;
  submitDisabled?: boolean;
}>;

/** Crear una contraseña con las reglas en vivo: lo usan activar la cuenta y recuperar la contraseña. */
export function NewPasswordForm({
  token,
  action,
  submitLabel,
  pendingLabel,
  children,
  submitDisabled = false,
}: Props) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [confirmationTouched, setConfirmationTouched] = useState(false);
  // En vivo solo se avisa del desajuste; la confirmación vacía la reporta el envío.
  const mismatch = confirmation !== "" && confirmation !== password;
  const confirmationMessage =
    confirmationTouched && mismatch
      ? confirmationError(password, confirmation)
      : state.fieldErrors.passwordConfirmation;
  const passwordMessage = state.fieldErrors.password;

  return (
    <form
      className="auth-form"
      action={formAction}
      noValidate
      aria-busy={pending || undefined}
      onSubmit={(event) => {
        // Controlados: React no los vacía tras un error del servidor. La API vuelve a validar.
        if (!mismatch) return;
        event.preventDefault();
        setConfirmationTouched(true);
        document.getElementById("passwordConfirmation")?.focus();
      }}
    >
      <input type="hidden" name="token" value={token} />
      {state.error && <Alert tone="error">{state.error}</Alert>}

      <div className="field">
        <label htmlFor="password">{ACCESO.campos.contrasena}</label>
        <PasswordInput
          id="password"
          name="password"
          maxLength={PASSWORD_MAX}
          required
          autoComplete="new-password"
          aria-invalid={passwordMessage ? true : undefined}
          aria-describedby={passwordMessage ? "password-rules password-error" : "password-rules"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <FieldError id="password" message={passwordMessage} />
      </div>

      <ul
        id="password-rules"
        className="password-rules"
        aria-label={ACCESO.campos.requisitos}
      >
        {passwordChecks(password).map((check) => (
          <li key={check.id} data-met={check.met}>
            {check.met ? <CircleCheck aria-hidden /> : <Circle aria-hidden />}
            {check.label}
            <span className="sr-only">
              {check.met ? ACCESO.campos.cumplido : ACCESO.campos.pendiente}
            </span>
          </li>
        ))}
      </ul>

      <div className="field">
        <label htmlFor="passwordConfirmation">
          {ACCESO.campos.confirmarContrasena}
        </label>
        <PasswordInput
          id="passwordConfirmation"
          name="passwordConfirmation"
          maxLength={PASSWORD_MAX}
          required
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          onBlur={() => setConfirmationTouched(true)}
          {...invalidProps("passwordConfirmation", confirmationMessage)}
        />
        <FieldError id="passwordConfirmation" message={confirmationMessage} />
      </div>

      {children}

      <Button
        className="auth-submit"
        type="submit"
        loading={pending}
        disabled={submitDisabled}
      >
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
