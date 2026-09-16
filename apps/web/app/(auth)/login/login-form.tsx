"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { login, type LoginState } from "../actions";

const initialState: LoginState = { error: null, email: "" };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form
      className="auth-form"
      action={formAction}
      aria-busy={pending || undefined}
      aria-describedby={state.error ? "login-error" : undefined}
    >
      {state.error ? (
        <Alert id="login-error" tone="error">
          {state.error}
        </Alert>
      ) : null}

      <div className="field">
        <label htmlFor="email">Correo</label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="tucorreo@empresa.ec"
          defaultValue={state.email}
          required
          autoFocus
        />
      </div>

      <div className="field">
        <div className="field-heading">
          <label htmlFor="password">Contraseña</label>
          <Link className="auth-link" href="/recuperar-contrasena">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </div>

      <Button className="auth-submit" type="submit" loading={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
      <p className="auth-security">
        Acceso seguro para miembros autorizados de tu equipo.
      </p>
    </form>
  );
}
