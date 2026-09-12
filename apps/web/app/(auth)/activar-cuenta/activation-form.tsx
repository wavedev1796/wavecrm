"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { activateAccount, type ActivationState } from "./actions";

const initialState: ActivationState = { error: null };

export function ActivationForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(
    activateAccount,
    initialState,
  );
  return (
    <form className="auth-form" action={action}>
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p className="auth-error" role="alert">
          <AlertCircle />
          {state.error}
        </p>
      )}
      <div className="field">
        <label htmlFor="password">Contraseña</label>
        <Input
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
        />
      </div>
      <div className="field">
        <label htmlFor="passwordConfirmation">Confirmar contraseña</label>
        <Input
          id="passwordConfirmation"
          name="passwordConfirmation"
          type="password"
          minLength={8}
          required
          autoComplete="new-password"
        />
      </div>
      <p className="password-hint">
        <CheckCircle2 />
        Usa al menos 8 caracteres, una letra y un número.
      </p>
      <Button className="auth-submit" disabled={pending}>
        {pending ? "Activando…" : "Activar mi cuenta"}
      </Button>
    </form>
  );
}
