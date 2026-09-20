'use client';

import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useState, type SyntheticEvent } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FieldError, invalidProps } from '@/components/ui/field-error';
import { Input } from '@/components/ui/input';
import { EMAIL_MAX, emailError, formText, normalizeEmail } from '@/lib/validation';

export function ForgotPasswordForm() {
  const [requestedFor, setRequestedFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ponytail: la pantalla no llama a ningún endpoint todavía. El envío del correo con token
  // queda para el Sprint 2 (el mailer de CRM-7 ya existe); entonces este handler pasa a ser
  // una server action contra POST /auth/forgot-password.
  function handleSubmit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = normalizeEmail(formText(new FormData(event.currentTarget), 'email'));
    const problem = emailError(email);
    setError(problem);
    if (!problem) setRequestedFor(email);
  }

  if (requestedFor) {
    return (
      <>
        <h1>Revisa tu correo</h1>
        <p className="auth-lead">
          Si <b>{requestedFor}</b> pertenece a una cuenta activa, recibirás un enlace para crear una
          contraseña nueva.
        </p>
        <Alert tone="success">Solicitud registrada.</Alert>
        <Alert tone="note">
          <b>Pendiente:</b> el envío del correo se habilita en el próximo sprint. Por ahora esta
          pantalla no envía nada.
        </Alert>
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

      <form className="auth-form" onSubmit={handleSubmit} noValidate>
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
            {...invalidProps('email', error)}
          />
          <FieldError id="email" message={error} />
        </div>

        <Button className="auth-submit" type="submit">
          Enviar enlace
        </Button>
      </form>

      <Link className="auth-back" href="/login">
        <ArrowLeft aria-hidden />
        Volver al inicio de sesión
      </Link>
    </>
  );
}
