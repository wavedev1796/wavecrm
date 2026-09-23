// @vitest-environment node
import { beforeEach, expect, test, vi } from 'vitest';
import type { NewPasswordState } from '@/lib/password-rules';
import { resetPassword } from './actions';

vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
}));

const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));

const initial: NewPasswordState = { error: null, fieldErrors: {} };
const form = (password: string, passwordConfirmation: string, token = 't') => {
  const data = new FormData();
  data.set('token', token);
  data.set('password', password);
  data.set('passwordConfirmation', passwordConfirmation);
  return data;
};

test('valida la contraseña y la confirmación antes de llamar al API', async () => {
  expect(await resetPassword(initial, form('corta1!', 'corta1!'))).toEqual({
    error: null,
    fieldErrors: { password: 'La contraseña debe tener entre 8 y 16 caracteres.' },
  });
  expect(await resetPassword(initial, form('Wave2026!', 'Wave2027!'))).toEqual({
    error: null,
    fieldErrors: { passwordConfirmation: 'Las contraseñas no coinciden.' },
  });
  expect(fetchMock).not.toHaveBeenCalled();
});

test('con datos válidos guarda la contraseña y lleva al login con el aviso', async () => {
  fetchMock.mockResolvedValue(Response.json({ message: 'ok' }));

  await expect(resetPassword(initial, form('Wave2026!', 'Wave2026!', 'token/raro'))).rejects.toThrow(
    'NEXT_REDIRECT /login?contrasena=actualizada',
  );
  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:4000/api/v1/auth/password-resets/token%2Fraro',
    expect.objectContaining({ method: 'POST' }),
  );
});

test('una contraseña ya usada se marca en el campo, no en la alerta', async () => {
  fetchMock.mockResolvedValueOnce(
    Response.json({ error: { message: 'Elige una contraseña que no hayas usado antes.' } }, { status: 409 }),
  );
  expect(await resetPassword(initial, form('Wave2026!', 'Wave2026!'))).toEqual({
    error: null,
    fieldErrors: { password: 'Elige una contraseña que no hayas usado antes.' },
  });
});

test('un enlace vencido muestra el motivo del API y no redirige', async () => {
  fetchMock.mockResolvedValueOnce(
    Response.json({ error: { message: 'El enlace no existe, venció o ya fue utilizado.' } }, { status: 400 }),
  );
  expect(await resetPassword(initial, form('Wave2026!', 'Wave2026!'))).toEqual({
    error: 'El enlace no existe, venció o ya fue utilizado.',
    fieldErrors: {},
  });
});

test('sin conexión avisa del servidor', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
  expect(await resetPassword(initial, form('Wave2026!', 'Wave2026!'))).toEqual({
    error: 'No pudimos conectar con el servidor. Inténtalo de nuevo.',
    fieldErrors: {},
  });
});
