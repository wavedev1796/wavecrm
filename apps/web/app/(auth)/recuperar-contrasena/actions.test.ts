// @vitest-environment node
import { beforeEach, expect, test, vi } from 'vitest';
import { requestPasswordReset, type ForgotPasswordState } from './actions';

const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));

const initial: ForgotPasswordState = { requestedFor: null, error: null, fieldError: null };
const form = (email: string) => {
  const data = new FormData();
  data.set('email', email);
  return data;
};

test('valida el correo antes de llamar al API', async () => {
  expect(await requestPasswordReset(initial, form('ana@empresa'))).toEqual({
    requestedFor: null,
    error: null,
    fieldError: 'Escribe un correo válido, por ejemplo nombre@empresa.ec.',
  });
  expect(await requestPasswordReset(initial, form('  '))).toEqual({
    requestedFor: null,
    error: null,
    fieldError: 'Ingresa tu correo.',
  });
  expect(fetchMock).not.toHaveBeenCalled();
});

test('normaliza el correo, lo envía al API y confirma la solicitud', async () => {
  fetchMock.mockResolvedValue(Response.json({ message: 'ok' }));

  expect(await requestPasswordReset(initial, form('  Ana@Empresa.EC '))).toEqual({
    requestedFor: 'ana@empresa.ec',
    error: null,
    fieldError: null,
  });
  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:4000/api/v1/auth/forgot-password',
    expect.objectContaining({ method: 'POST', body: JSON.stringify({ email: 'ana@empresa.ec' }) }),
  );
});

test('traduce el límite de intentos y un fallo del API', async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ error: { message: 'x' } }, { status: 429 }));
  expect((await requestPasswordReset(initial, form('ana@empresa.ec'))).error).toBe(
    'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
  );

  fetchMock.mockResolvedValueOnce(Response.json({ error: { message: 'x' } }, { status: 500 }));
  expect((await requestPasswordReset(initial, form('ana@empresa.ec'))).error).toBe(
    'No pudimos enviar el enlace. Inténtalo de nuevo.',
  );
});

test('sin conexión avisa del servidor y no confirma nada', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
  expect(await requestPasswordReset(initial, form('ana@empresa.ec'))).toEqual({
    requestedFor: null,
    fieldError: null,
    error: 'No pudimos conectar con el servidor. Inténtalo de nuevo.',
  });
});
