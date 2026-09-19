// @vitest-environment node
import { NextRequest, type NextResponse } from 'next/server';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { middleware } from './middleware';

const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => vi.useRealTimers());

let serial = 0;
/** JWT falso y único: el middleware solo lee su `exp` al escribir la cookie. */
function token(secondsLeft: number) {
  serial += 1;
  const payload = { exp: Math.floor(Date.now() / 1000) + secondsLeft, jti: serial };
  return `cabecera.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.firma`;
}

function visit(path: string, cookies: Record<string, string> = {}) {
  const cookie = Object.entries(cookies)
    .map(([name, value]) => `${name}=${value}`)
    .join('; ');
  return middleware(new NextRequest(`http://localhost:3000${path}`, { headers: { cookie } })) as Promise<NextResponse>;
}

const passes = (response: NextResponse) => response.headers.get('x-middleware-next') === '1';
const location = (response: NextResponse) => response.headers.get('location');
const cleared = (response: NextResponse) =>
  response.cookies.get('wave_access')?.value === '' && response.cookies.get('wave_refresh')?.value === '';

function api({ me = 200, refresh }: { me?: number; refresh?: { accessToken: string; refreshToken: string } | null }) {
  fetchMock.mockImplementation(async (url: string) => {
    if (url.endsWith('/auth/me')) return new Response(null, { status: me });
    return refresh ? Response.json(refresh) : new Response(null, { status: 401 });
  });
}

test('sin sesión, las rutas públicas pasan y las privadas van a /login', async () => {
  for (const path of ['/login', '/recuperar-contrasena', '/activar-cuenta']) {
    expect(passes(await visit(path)), path).toBe(true);
  }
  for (const path of ['/', '/pipeline', '/usuarios']) {
    expect(location(await visit(path)), path).toBe('http://localhost:3000/login');
  }
  expect(fetchMock).not.toHaveBeenCalled();
});

test('con un access token vigente la ruta pasa y /login lleva al pipeline', async () => {
  api({ me: 200 });
  const session = { wave_access: token(900), wave_refresh: token(28_800) };
  expect(passes(await visit('/pipeline', session))).toBe(true);
  expect(location(await visit('/login', session))).toBe('http://localhost:3000/pipeline');
});

test('un access token rechazado por el API (cuenta desactivada) cierra la sesión con aviso', async () => {
  api({ me: 401 });
  const response = await visit('/pipeline', { wave_access: token(900), wave_refresh: token(28_800) });
  expect(location(response)).toBe('http://localhost:3000/login?sesion=expirada');
  expect(cleared(response)).toBe(true);
});

test('sin access token renueva con el refresh y escribe las cookies nuevas', async () => {
  const renewed = { accessToken: token(900), refreshToken: token(28_800) };
  api({ refresh: renewed });
  const response = await visit('/pipeline', { wave_refresh: token(28_800) });
  expect(passes(response)).toBe(true);
  expect(response.cookies.get('wave_access')?.value).toBe(renewed.accessToken);
  expect(response.cookies.get('wave_refresh')?.value).toBe(renewed.refreshToken);

  api({ refresh: { accessToken: token(900), refreshToken: token(28_800) } });
  expect(location(await visit('/login', { wave_refresh: token(28_800) }))).toBe('http://localhost:3000/pipeline');
});

test('renovaciones simultáneas con el mismo refresh comparten una sola llamada durante 10 s', async () => {
  vi.useFakeTimers({ toFake: ['setTimeout'] });
  api({ refresh: { accessToken: token(900), refreshToken: token(28_800) } });
  const session = { wave_refresh: token(28_800) };
  const responses = await Promise.all([visit('/pipeline', session), visit('/contactos', session)]);
  expect(responses.every(passes)).toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(1);

  vi.advanceTimersByTime(10_000);
  await visit('/pipeline', session);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('un refresh inválido o un API caído cierran la sesión con aviso', async () => {
  api({ refresh: null });
  const invalid = await visit('/pipeline', { wave_refresh: token(28_800) });
  expect(location(invalid)).toBe('http://localhost:3000/login?sesion=expirada');
  expect(cleared(invalid)).toBe(true);

  fetchMock.mockRejectedValue(new TypeError('fetch failed'));
  expect(location(await visit('/pipeline', { wave_refresh: token(28_800) }))).toBe(
    'http://localhost:3000/login?sesion=expirada',
  );
});
