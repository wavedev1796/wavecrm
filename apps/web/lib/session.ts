/**
 * Sesión del navegador. Los tokens viajan en cookies httpOnly, así que el JavaScript
 * del cliente nunca los ve.
 *
 * ponytail: cookie como único almacén; para migrar a Redis (invalidación central,
 * sesión compartida entre instancias) basta con cambiar ESTE archivo: guardar un
 * sessionId opaco en la cookie y los tokens en Redis bajo esa clave. Por eso las
 * funciones ya son asíncronas y reciben el almacén de cookies de quien llama
 * (`await cookies()` en server actions, `request.cookies`/`response.cookies` en el
 * middleware): el resto de la aplicación no sabe dónde viven los datos.
 */

export type Session = {
  /** Ausente cuando el access token ya expiró; el middleware lo renueva con el refresh. */
  accessToken: string | null;
  refreshToken: string;
};

type CookieReader = { get(name: string): { value: string } | undefined };
type CookieWriter = {
  set(name: string, value: string, options: typeof cookieOptions & { maxAge: number }): unknown;
  delete(name: string): unknown;
};

const ACCESS_COOKIE = 'wave_access';
const REFRESH_COOKIE = 'wave_refresh';

/** Destino cuando una sesión deja de servir: `/login` lo explica con un mensaje fijo. */
export const SESSION_EXPIRED_PATH = '/login?sesion=expirada';

const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
} as const;

/**
 * Segundos de vida que le quedan al token según su claim `exp`, para que la cookie muera
 * a la vez que el token sin duplicar aquí la duración que decide el API. No verifica la
 * firma: nunca se usa para autorizar, eso lo hace el API en cada petición.
 */
function secondsUntilExpiry(token: string) {
  const payload = token.split('.')[1] ?? '';
  const { exp } = JSON.parse(atob(payload.replaceAll('-', '+').replaceAll('_', '/'))) as {
    exp: number;
  };
  return exp - Math.floor(Date.now() / 1000);
}

export async function readSession(jar: CookieReader): Promise<Session | null> {
  const refreshToken = jar.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;
  return { accessToken: jar.get(ACCESS_COOKIE)?.value ?? null, refreshToken };
}

export async function writeSession(jar: CookieWriter, accessToken: string, refreshToken: string) {
  jar.set(ACCESS_COOKIE, accessToken, { ...cookieOptions, maxAge: secondsUntilExpiry(accessToken) });
  jar.set(REFRESH_COOKIE, refreshToken, { ...cookieOptions, maxAge: secondsUntilExpiry(refreshToken) });
}

export async function clearSession(jar: CookieWriter) {
  jar.delete(ACCESS_COOKIE);
  jar.delete(REFRESH_COOKIE);
}
