// @vitest-environment node
import { expect, test, vi } from 'vitest';
import { clearSession, readSession, SESSION_EXPIRED_PATH, writeSession } from './session';

/** JWT falso: solo importa el `exp`, que `writeSession` usa para la vida de la cookie. */
function token(secondsLeft: number) {
  const payload = { exp: Math.floor(Date.now() / 1000) + secondsLeft, sub: '>>>???' };
  return `cabecera.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.firma`;
}

function jar(values: Record<string, string> = {}) {
  return {
    get: (name: string) => (name in values ? { value: values[name] } : undefined),
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
  const [[accessName, accessValue, accessOptions], [refreshName, , refreshOptions]] = cookies.set.mock.calls;
  expect([accessName, accessValue, refreshName]).toEqual(['wave_access', access, 'wave_refresh']);
  expect(accessOptions).toMatchObject({ httpOnly: true, sameSite: 'lax', path: '/', secure: false });
  expect(accessOptions.maxAge).toBeGreaterThanOrEqual(899);
  expect(refreshOptions.maxAge).toBeGreaterThanOrEqual(28_799);
});

test('clearSession borra las dos cookies', async () => {
  const cookies = jar();
  await clearSession(cookies);
  expect(cookies.delete.mock.calls).toEqual([['wave_access'], ['wave_refresh']]);
});

test('la sesión terminada se anuncia con un código fijo, no con texto libre', () => {
  expect(SESSION_EXPIRED_PATH).toBe('/login?sesion=expirada');
});
