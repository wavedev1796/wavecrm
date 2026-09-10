'use server';

import { redirect } from 'next/navigation';
import { createSession } from '@/lib/session';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export type LoginState = {
  error: string | null;
  /** Se devuelve para no obligar al usuario a reescribir el correo tras un error. */
  email: string;
};

const ERROR_BY_STATUS: Record<number, string> = {
  400: 'Revisa el correo y la contraseña ingresados.',
  401: 'Correo o contraseña incorrectos.',
  429: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
};

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  if (!email || !password) return { email, error: 'Ingresa tu correo y tu contraseña.' };

  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
  } catch {
    return { email, error: 'No pudimos conectar con el servidor. Inténtalo en unos segundos.' };
  }

  if (!response.ok) {
    return {
      email,
      error: ERROR_BY_STATUS[response.status] ?? 'No pudimos iniciar sesión. Inténtalo de nuevo.',
    };
  }

  const data = (await response.json()) as { accessToken?: string; refreshToken?: string };
  if (!data.accessToken || !data.refreshToken) {
    return { email, error: 'El servidor devolvió una respuesta inesperada. Avisa al equipo técnico.' };
  }

  await createSession(data.accessToken, data.refreshToken);
  redirect('/pipeline');
}
