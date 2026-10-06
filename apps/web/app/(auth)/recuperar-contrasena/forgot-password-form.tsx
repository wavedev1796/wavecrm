'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useActionState } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldError, invalidProps } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { ACCESO } from '@/content/acceso';
import { EMAIL_MAX } from '@/lib/validation';
import { requestPasswordReset, type ForgotPasswordState } from './actions';

const initialState: ForgotPasswordState = { requestedFor: null, error: null, fieldError: null };

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);

  if (state.requestedFor) {
    return (
      <>
        <h1>{ACCESO.recuperar.confirmacion.encabezado}</h1>
        <p className="auth-lead">
          {ACCESO.recuperar.confirmacion.antes}
          <b>{state.requestedFor}</b>
          {ACCESO.recuperar.confirmacion.despues}
        </p>
        <Alert tone="success">{ACCESO.recuperar.confirmacion.registrada}</Alert>
        <Link className="auth-back" href="/login">
          <ArrowLeft aria-hidden />
          {ACCESO.volverAlLogin}
        </Link>
      </>
    );
  }

  return (
    <>
      <h1>{ACCESO.recuperar.encabezado}</h1>
      <p className="auth-lead">{ACCESO.recuperar.lead}</p>

      <form className="auth-form" action={action} noValidate aria-busy={pending || undefined}>
        {state.error && <Alert tone="error">{state.error}</Alert>}

        <div className="field">
          <label htmlFor="email">{ACCESO.campos.correo}</label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder={ACCESO.campos.correoPlaceholder}
            maxLength={EMAIL_MAX}
            required
            autoFocus
            {...invalidProps('email', state.fieldError)}
          />
          <FieldError id="email" message={state.fieldError} />
        </div>

        <Button className="auth-submit" type="submit" loading={pending}>
          {pending ? ACCESO.recuperar.enviando : ACCESO.recuperar.enviar}
        </Button>
      </form>

      <Link className="auth-back" href="/login">
        <ArrowLeft aria-hidden />
        {ACCESO.volverAlLogin}
      </Link>
    </>
  );
}
