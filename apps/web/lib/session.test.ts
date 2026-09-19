// @vitest-environment node
import { expect, test, vi } from 'vitest';
import { clearSession, readSession, SESSION_EXPIRED_PATH, writeSession } from './session';

/** JWT falso: solo importa el `exp`, que `writeSession` usa para la vida de la cookie. */
function token(secondsLeft: number) {
  const payload = { exp: Math.floor(Date.now() / 1000) + secondsLeft, sub: '>>>???' };
  return `cabecera.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.firma`;
}

type CookieOptions = { httpOnly: boolean; sameSite: string; path: string; secure: boolean; maxAge: number };

function jar(values: Record<string, string> = {}) {
  return {
    get: (name: string) => (name in values ? { value: String(values[name]) } : undefined),
    set: vi.fn(),
    delete: vi.fn(),
  };
}

test('sin cookie de refresh no hay sesión', async () => {
  expect(await readSession(jar({ wave_access: 'a' }))).toBeNull();
});

test('solo con refresh la sesión existe y el access queda en null para que el middleware lo renueve', async () => {
  expect(await readSession(jar({ wave_refresh: 'r' }))).toEqual({ accessToken: null, refreshToken: 'r' });
});

test('writeSession guarda cookies httpOnly que viven lo mismo que cada token', async () => {
  const cookies = jar();
  const access = token(900);
  const refresh = token(28_800);
  await writeSession(cookies, access, refresh);
  const [accessCall, refreshCall] = cookies.set.mock.calls as [
    [string, string, CookieOptions],
    [string, string, CookieOptions],
  ];
  expect([accessCall[0], accessCall[1], refreshCall[0]]).toEqual(['wave_access', access, 'wave_refresh']);
  expect(accessCall[2]).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/', secure: false });
  expect(accessCall[2].maxAge).toBeGreaterThanOrEqual(899);
  expect(refreshCall[2].maxAge).toBeGreaterThanOrEqual(28_799);
});

test('clearSession borra las dos cookies', async () => {
  const cookies = jar();
  await clearSession(cookies);
  expect(cookies.delete.mock.calls).toEqual([['wave_access'], ['wave_refresh']]);
});

test('la sesión terminada se anuncia con un código fijo, no con texto libre', () => {
  expect(SESSION_EXPIRED_PATH).toBe('/login?sesion=expirada');
});
