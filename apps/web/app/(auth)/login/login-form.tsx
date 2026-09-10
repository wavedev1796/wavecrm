'use client';

import { CircleAlert } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { login, type LoginState } from '../actions';

const initialState: LoginState = { error: null, email: '' };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form className="auth-form" action={formAction}>
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
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
      </div>

      <Link className="auth-link" href="/recuperar-contrasena">
        ¿Olvidaste tu contraseña?
      </Link>

      {state.error ? (
        <p className="auth-error" role="alert">
          <CircleAlert aria-hidden />
          {state.error}
        </p>
      ) : null}

      <Button className="auth-submit" type="submit" disabled={pending}>
        {pending ? 'Entrando…' : 'Entrar'}
      </Button>
    </form>
  );
}
