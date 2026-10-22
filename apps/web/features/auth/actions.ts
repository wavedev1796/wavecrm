'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { API_URL } from '@/lib/api';
import { ACCESO } from '@/content/acceso';
import { COMUN } from '@/content/comun';
import { apiError } from '@/lib/authenticated-api';
import { clearSession, readSession, writeSession } from '@/lib/session';
import {
  emailError,
  fieldErrors,
  formText,
  loginPasswordError,
  normalizeEmail,
} from '@/lib/validation';

export type LoginState = {
  error: string | null;
  /** Se devuelve para no obligar al usuario a reescribir el correo tras un error. */
  email: string;
  fieldErrors: { email?: string; password?: string };
};

const ERROR_BY_STATUS: Record<number, string> = {
  401: ACCESO.login.errores.credenciales,
  403: ACCESO.login.errores.desactivada,
  429: ACCESO.login.errores.intentos,
};

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const email = normalizeEmail(formText(formData, 'email'));
  const password = formText(formData, 'password');
  const invalid = fieldErrors({ email: emailError(email), password: loginPasswordError(password) });
  if (invalid) return { email, error: null, fieldErrors: invalid };

  let response: Response;
  try {
    response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      cache: 'no-store',
    });
  } catch {
    return { email, fieldErrors: {}, error: COMUN.errores.conexion };
  }

  if (!response.ok) {
    // Un 400 significa que las reglas de la web y del API se separaron: se muestra el motivo del API.
    const error =
      ERROR_BY_STATUS[response.status] ??
      (response.status === 400 ? await apiError(response) : ACCESO.login.errores.generico);
    return { email, fieldErrors: {}, error };
  }

  const data = (await response.json()) as { accessToken?: string; refreshToken?: string };
  if (!data.accessToken || !data.refreshToken) {
    return { email, fieldErrors: {}, error: ACCESO.login.errores.respuesta };
  }

  await writeSession(await cookies(), data.accessToken, data.refreshToken);
  redirect('/pipeline');
}

export async function logout() {
  const jar = await cookies();
  const session = await readSession(jar);
  if (session) {
    // Si el API no responde, la sesión local se cierra igual; el refresh token seguiría
    // válido en el servidor hasta expirar.
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
      cache: 'no-store',
    }).catch(() => undefined);
  }
  await clearSession(jar);
  redirect('/login');
}
