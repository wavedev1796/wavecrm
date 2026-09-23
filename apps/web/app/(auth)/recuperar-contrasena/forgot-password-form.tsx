'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldError, invalidProps } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { EMAIL_MAX } from '@/lib/validation';
import { requestPasswordReset, type ForgotPasswordState } from './actions';

const initialState: ForgotPasswordState = { requestedFor: null, error: null, fieldError: null };

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);

  if (state.requestedFor) {
    return (
      <>
        <h1>Revisa tu correo</h1>
        <p className="auth-lead">
          Si <b>{state.requestedFor}</b> pertenece a una cuenta activa, recibirás un enlace para
          crear una contraseña nueva. Vence en una hora y solo puede usarse una vez.
        </p>
        <Alert tone="success">Solicitud registrada.</Alert>
        <Link className="auth-back" href="/login">
          <ArrowLeft aria-hidden />
          Volver al inicio de sesión
        </Link>
      </>
    );
  }

  return (
    <>
      <h1>¿Olvidaste tu contraseña?</h1>
      <p className="auth-lead">Escribe tu correo y te enviaremos un enlace para crear una nueva.</p>

      <form className="auth-form" action={action} noValidate aria-busy={pending || undefined}>
        {state.error && <Alert tone="error">{state.error}</Alert>}

        <div className="field">
          <label htmlFor="email">Correo</label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tucorreo@empresa.ec"
            maxLength={EMAIL_MAX}
            required
            autoFocus
            {...invalidProps('email', state.fieldError)}
          />
          <FieldError id="email" message={state.fieldError} />
        </div>

        <Button className="auth-submit" type="submit" loading={pending}>
          {pending ? 'Enviando…' : 'Enviar enlace'}
        </Button>
      </form>

      <Link className="auth-back" href="/login">
        <ArrowLeft aria-hidden />
        Volver al inicio de sesión
      </Link>
    </>
  );
}
