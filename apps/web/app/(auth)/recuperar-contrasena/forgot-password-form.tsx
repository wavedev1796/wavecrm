'use client';

import { ArrowLeft, MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ForgotPasswordForm() {
  const [requestedFor, setRequestedFor] = useState<string | null>(null);

  // ponytail: la pantalla no llama a ningún endpoint todavía. El envío del correo con
  // token depende del mailer que trae CRM-7 (usuarios e invitaciones); cuando exista,
  // este handler pasa a ser una server action contra POST /auth/forgot-password.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRequestedFor(String(new FormData(event.currentTarget).get('email') ?? ''));
  }

  if (requestedFor) {
    return (
      <>
        <h1>Revisa tu correo</h1>
        <p>
          Si <b>{requestedFor}</b> pertenece a una cuenta activa, recibirás un enlace para crear una
          contraseña nueva.
        </p>
        <p className="auth-success" role="status">
          <MailCheck aria-hidden />
          Solicitud registrada.
        </p>
        <p className="auth-note">
          <b>Pendiente:</b> el envío del correo se habilita junto con CRM-7 (usuarios e
          invitaciones). Por ahora esta pantalla no envía nada.
        </p>
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
      <p>Escribe tu correo y te enviaremos un enlace para crear una nueva.</p>

      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="email">Correo</label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="tucorreo@empresa.ec"
            required
            autoFocus
          />
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
