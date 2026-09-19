"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, invalidProps } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { EMAIL_MAX, LOGIN_PASSWORD_MAX } from "@/lib/validation";
import { login, type LoginState } from "../actions";

const initialState: LoginState = { error: null, email: "", fieldErrors: {} };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);
  const { fieldErrors } = state;

  return (
    <form
      className="auth-form"
      action={formAction}
      noValidate
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
          maxLength={EMAIL_MAX}
          defaultValue={state.email}
          required
          autoFocus
          {...invalidProps("email", fieldErrors.email)}
        />
        <FieldError id="email" message={fieldErrors.email} />
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
          maxLength={LOGIN_PASSWORD_MAX}
          required
          {...invalidProps("password", fieldErrors.password)}
        />
        <FieldError id="password" message={fieldErrors.password} />
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
