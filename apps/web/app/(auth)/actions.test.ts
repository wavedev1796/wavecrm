// @vitest-environment node
import { beforeEach, expect, test, vi } from 'vitest';
import { login, logout, type LoginState } from './actions';

const state = vi.hoisted(() => ({ cookies: new Map<string, string>() }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (state.cookies.has(name) ? { value: String(state.cookies.get(name)) } : undefined),
    set: (name: string, value: string) => {
      state.cookies.set(name, value);
    },
    delete: (name: string) => {
      state.cookies.delete(name);
    },
  }),
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
}));

const fetchMock = vi.fn();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  state.cookies.clear();
});

const initial: LoginState = { error: null, email: '', fieldErrors: {} };

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

function token(secondsLeft: number) {
  const payload = { exp: Math.floor(Date.now() / 1000) + secondsLeft };
  return `cabecera.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.firma`;
}

test('valida los campos antes de llamar al API', async () => {
  expect(await login(initial, form({ email: '', password: '' }))).toEqual({
    email: '',
    error: null,
    fieldErrors: { email: 'Ingresa tu correo.', password: 'Ingresa tu contraseña.' },
  });
  expect((await login(initial, form({ email: 'ana@empresa', password: 'x' }))).fieldErrors).toEqual({
    email: 'Escribe un correo válido, por ejemplo nombre@empresa.ec.',
  });
  expect((await login(initial, form({ email: 'ana@empresa.ec', password: 'a'.repeat(17) }))).fieldErrors).toEqual({
    password: 'La contraseña no puede superar 16 caracteres.',
  });
  expect(fetchMock).not.toHaveBeenCalled();
});

test('envía el correo normalizado y traduce cada respuesta del API a un mensaje claro', async () => {
  for (const [response, message] of [
    [new Response(null, { status: 401 }), 'Correo o contraseña incorrectos.'],
    [new Response(null, { status: 403 }), 'Tu cuenta está desactivada. Pide a un administrador que la reactive.'],
    [new Response(null, { status: 429 }), 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.'],
    [Response.json({ error: { message: ['Motivo del API.'] } }, { status: 400 }), 'Motivo del API.'],
    [new Response(null, { status: 500 }), 'No pudimos iniciar sesión. Inténtalo de nuevo.'],
  ] as const) {
    fetchMock.mockResolvedValueOnce(response);
    expect(await login(initial, form({ email: ' Ana@Empresa.EC ', password: 'Wave2026!' }))).toEqual({
      email: 'ana@empresa.ec',
      error: message,
      fieldErrors: {},
    });
  }
  const [[, options]] = fetchMock.mock.calls as [[string, { body: string }]];
  expect(JSON.parse(options.body)).toEqual({ email: 'ana@empresa.ec', password: 'Wave2026!' });
});

test('sin conexión con el API lo dice y conserva el correo', async () => {
  fetchMock.mockRejectedValue(new TypeError('fetch failed'));
  expect(await login(initial, form({ email: 'ana@empresa.ec', password: 'x' }))).toEqual({
    email: 'ana@empresa.ec',
    error: 'No pudimos conectar con el servidor. Inténtalo de nuevo.',
    fieldErrors: {},
  });
});

test('una respuesta sin tokens se reporta como inesperada', async () => {
  fetchMock.mockResolvedValue(Response.json({}));
  expect((await login(initial, form({ email: 'ana@empresa.ec', password: 'x' }))).error).toBe(
    'El servidor devolvió una respuesta inesperada. Avisa al equipo técnico.',
  );
});

test('con credenciales correctas guarda la sesión y entra al pipeline', async () => {
  const tokens = { accessToken: token(900), refreshToken: token(28_800) };
  fetchMock.mockResolvedValue(Response.json(tokens));
  await expect(login(initial, form({ email: 'ana@empresa.ec', password: 'Wave2026!' }))).rejects.toThrow(
    'NEXT_REDIRECT /pipeline',
  );
  expect(Object.fromEntries(state.cookies)).toEqual({
    wave_access: tokens.accessToken,
    wave_refresh: tokens.refreshToken,
  });
});

test('logout revoca el refresh en el API, borra las cookies y vuelve al login', async () => {
  state.cookies.set('wave_access', 'a').set('wave_refresh', 'r');
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
  await expect(logout()).rejects.toThrow('NEXT_REDIRECT /login');
  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:4000/api/v1/auth/logout',
    expect.objectContaining({ method: 'POST', body: JSON.stringify({ refreshToken: 'r' }) }),
  );
  expect(state.cookies.size).toBe(0);
});

test('logout cierra la sesión local aunque el API no responda, y sin sesión no llama al API', async () => {
  state.cookies.set('wave_refresh', 'r');
  fetchMock.mockRejectedValue(new TypeError('fetch failed'));
  await expect(logout()).rejects.toThrow('NEXT_REDIRECT /login');
  expect(state.cookies.size).toBe(0);

  fetchMock.mockClear();
  await expect(logout()).rejects.toThrow('NEXT_REDIRECT /login');
  expect(fetchMock).not.toHaveBeenCalled();
});
