// @vitest-environment node
import { beforeEach, expect, test, vi } from 'vitest';
import { apiError, authenticatedApi } from './authenticated-api';

const state = vi.hoisted(() => ({ cookies: {} as Record<string, string> }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (name in state.cookies ? { value: state.cookies[name] } : undefined),
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
  state.cookies = { wave_access: 'access', wave_refresh: 'refresh' };
});

test('sin access token manda al login con el aviso de sesión terminada', async () => {
  state.cookies = {};
  await expect(authenticatedApi('/auth/me')).rejects.toThrow('NEXT_REDIRECT /login?sesion=expirada');
  expect(fetchMock).not.toHaveBeenCalled();
});

test('envía el access token y, si hay cuerpo, el tipo de contenido', async () => {
  fetchMock.mockResolvedValue(new Response('{}', { status: 201 }));
  const response = await authenticatedApi('/users', { method: 'POST', body: '{}' });
  expect(response.status).toBe(201);
  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:4000/api/v1/users',
    expect.objectContaining({
      method: 'POST',
      cache: 'no-store',
      headers: { Authorization: 'Bearer access', 'Content-Type': 'application/json' },
    }),
  );
});

test('un FormData viaja sin Content-Type JSON para que fetch arme el multipart', async () => {
  fetchMock.mockResolvedValue(new Response('{}', { status: 201 }));
  const body = new FormData();
  await authenticatedApi('/contacts/import', { method: 'POST', body });
  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:4000/api/v1/contacts/import',
    expect.objectContaining({ body, headers: { Authorization: 'Bearer access' } }),
  );
});

test('si el API responde 401 la sesión terminó', async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 401 }));
  await expect(authenticatedApi('/auth/me')).rejects.toThrow('NEXT_REDIRECT /login?sesion=expirada');
});

test('apiError une los mensajes del API y usa un texto genérico si no hay JSON', async () => {
  expect(await apiError(Response.json({ error: { message: ['Uno.', 'Dos.'] } }, { status: 400 }))).toBe('Uno. Dos.');
  expect(await apiError(Response.json({ error: { message: 'Ya existe.' } }, { status: 409 }))).toBe('Ya existe.');
  expect(await apiError(new Response('<html>', { status: 502 }))).toBe('No pudimos completar la operación.');
});
