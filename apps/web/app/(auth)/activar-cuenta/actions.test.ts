// @vitest-environment node
import { beforeEach, expect, test, vi } from 'vitest';
import { activateAccount, type ActivationState } from './actions';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
}));

const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));

const initial: ActivationState = { error: null, fieldErrors: {} };
const form = (password: string, passwordConfirmation: string, token = 't') => {
  const data = new FormData();
  data.set('token', token);
  data.set('password', password);
  data.set('passwordConfirmation', passwordConfirmation);
  return data;
};

test('valida la contraseña y la confirmación antes de llamar al API', async () => {
  expect(await activateAccount(initial, form('abcdefg1!', 'abcdefg1!'))).toEqual({
    error: null,
    fieldErrors: {
      password: 'La contraseña debe incluir una mayúscula, una minúscula, un número y un carácter especial.',
    },
  });
  expect((await activateAccount(initial, form('Wave2026!', ''))).fieldErrors).toEqual({
    passwordConfirmation: 'Confirma tu contraseña.',
  });
  expect((await activateAccount(initial, form('Wave2026!', 'Wave2026?'))).fieldErrors).toEqual({
    passwordConfirmation: 'Las contraseñas no coinciden.',
  });
  expect(fetchMock).not.toHaveBeenCalled();
});

test('activa con el token codificado y lleva al login con aviso', async () => {
  fetchMock.mockResolvedValue(Response.json({ message: 'Cuenta activada correctamente.' }));
  await expect(activateAccount(initial, form('Wave2026!', 'Wave2026!', 'token/raro'))).rejects.toThrow(
    'NEXT_REDIRECT /login?activated=1',
  );
  expect(fetchMock).toHaveBeenCalledWith(
    'http://localhost:4000/api/v1/users/invitations/token%2Fraro/activate',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ password: 'Wave2026!', passwordConfirmation: 'Wave2026!' }),
    }),
  );
});

test('muestra el motivo del API (invitación usada o vencida)', async () => {
  fetchMock.mockResolvedValue(
    Response.json({ error: { message: 'La invitación no existe, venció o ya fue utilizada.' } }, { status: 400 }),
  );
  expect(await activateAccount(initial, form('Wave2026!', 'Wave2026!'))).toEqual({
    error: 'La invitación no existe, venció o ya fue utilizada.',
    fieldErrors: {},
  });
});

test('sin conexión lo dice', async () => {
  fetchMock.mockRejectedValue(new TypeError('fetch failed'));
  expect((await activateAccount(initial, form('Wave2026!', 'Wave2026!'))).error).toBe(
    'No pudimos conectar con el servidor. Inténtalo de nuevo.',
  );
});
