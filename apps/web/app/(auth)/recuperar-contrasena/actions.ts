'use server';

import { API_URL } from '@/lib/api';
import { emailError, formText, normalizeEmail } from '@/lib/validation';

export type ForgotPasswordState = {
  /** Correo al que se pidió el enlace; con valor, la pantalla muestra la confirmación. */
  requestedFor: string | null;
  error: string | null;
  fieldError: string | null;
};

export async function requestPasswordReset(
  _previous: ForgotPasswordState,
  formData: FormData,
): Promise<ForgotPasswordState> {
  const email = normalizeEmail(formText(formData, 'email'));
  const problem = emailError(email);
  if (problem) return { requestedFor: null, error: null, fieldError: problem };

  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      cache: 'no-store',
    });
  } catch {
    return {
      requestedFor: null,
      fieldError: null,
      error: 'No pudimos conectar con el servidor. Inténtalo de nuevo.',
    };
  }

  if (!response.ok) {
    return {
      requestedFor: null,
      fieldError: null,
      error:
        response.status === 429
          ? 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.'
          : 'No pudimos enviar el enlace. Inténtalo de nuevo.',
    };
  }
  // El API responde igual exista o no la cuenta, así que esta pantalla tampoco distingue.
  return { requestedFor: email, error: null, fieldError: null };
}
