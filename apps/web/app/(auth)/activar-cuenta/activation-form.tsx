"use client";

import { Circle, CircleCheck } from "lucide-react";
import { useActionState, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { passwordChecks } from "@/lib/password-rules";
import { activateAccount, type ActivationState } from "./actions";

const initialState: ActivationState = { error: null };
const MISMATCH = "Las contraseñas no coinciden.";

export function ActivationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(
    activateAccount,
    initialState,
  );
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [confirmationTouched, setConfirmationTouched] = useState(false);
  const mismatch = confirmation !== "" && confirmation !== password;
  const showMismatch = confirmationTouched && mismatch;

  return (
    <form
      className="auth-form"
      action={action}
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
        <label htmlFor="password">Contraseña</label>
        <PasswordInput
          id="password"
          name="password"
          minLength={8}
          required
          autoComplete="new-password"
          aria-describedby="password-rules"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>

      <ul
        id="password-rules"
        className="password-rules"
        aria-label="Requisitos de la contraseña"
      >
        {passwordChecks(password).map((check) => (
          <li key={check.id} data-met={check.met}>
            {check.met ? <CircleCheck aria-hidden /> : <Circle aria-hidden />}
            {check.label}
            <span className="sr-only">
              {check.met ? " (cumplido)" : " (pendiente)"}
            </span>
          </li>
        ))}
      </ul>

      <div className="field">
        <label htmlFor="passwordConfirmation">Confirmar contraseña</label>
        <PasswordInput
          id="passwordConfirmation"
          name="passwordConfirmation"
          minLength={8}
          required
          autoComplete="new-password"
          value={confirmation}
          onChange={(event) => setConfirmation(event.target.value)}
          onBlur={() => setConfirmationTouched(true)}
          aria-invalid={showMismatch || undefined}
          aria-describedby={showMismatch ? "confirmation-error" : undefined}
        />
        {showMismatch && (
          <p id="confirmation-error" className="field-error">
            {MISMATCH}
          </p>
        )}
      </div>

      <Button className="auth-submit" type="submit" loading={pending}>
        {pending ? "Activando…" : "Activar mi cuenta"}
      </Button>
    </form>
  );
}
