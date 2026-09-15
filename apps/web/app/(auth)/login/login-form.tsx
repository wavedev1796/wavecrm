'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PasswordInput } from '@/components/ui/password-input';
import { login, type LoginState } from '../actions';

const initialState: LoginState = { error: null, email: '' };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form
      className="auth-form"
      action={formAction}
      aria-busy={pending || undefined}
      aria-describedby={state.error ? 'login-error' : undefined}
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
        <label htmlFor="password">Contraseña</label>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </div>

      <Link className="auth-link" href="/recuperar-contrasena">
        ¿Olvidaste tu contraseña?
      </Link>

      <Button className="auth-submit" type="submit" loading={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  );
}
