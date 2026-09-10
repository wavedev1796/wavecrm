import { cookies } from 'next/headers';

/**
 * Sesión del navegador. Hoy los tokens viajan dentro de cookies httpOnly, así que
 * JavaScript del cliente nunca los ve.
 *
 * ponytail: cookie como único almacén; para migrar a Redis (invalidación central,
 * sesión compartida entre instancias) basta con cambiar ESTE archivo: guardar un
 * sessionId opaco en la cookie y los tokens en Redis bajo esa clave. El resto de la
 * aplicación solo conoce estas funciones, no dónde viven los datos.
 */

export type Session = {
  /** Ausente cuando el access token ya expiró; renovarlo con el refresh es tarea de CRM-10. */
  accessToken: string | null;
  refreshToken: string;
};

const ACCESS_COOKIE = 'wave_access';
const REFRESH_COOKIE = 'wave_refresh';
const ACCESS_MAX_AGE = 15 * 60; // igual al TTL del access token que emite el API
const REFRESH_MAX_AGE = 7 * 24 * 60 * 60;

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
} as const;

export async function createSession(accessToken: string, refreshToken: string) {
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, accessToken, { ...cookieOptions, maxAge: ACCESS_MAX_AGE });
  jar.set(REFRESH_COOKIE, refreshToken, { ...cookieOptions, maxAge: REFRESH_MAX_AGE });
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;
  return { accessToken: jar.get(ACCESS_COOKIE)?.value ?? null, refreshToken };
}
