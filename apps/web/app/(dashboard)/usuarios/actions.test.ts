// @vitest-environment node
import { revalidatePath } from 'next/cache';
import { expect, test, vi } from 'vitest';
import { authenticatedApi } from '@/lib/authenticated-api';
import {
  deactivateUser,
  deleteUser,
  inviteUser,
  reactivateUser,
  resendInvitation,
  updateUser,
  type UserFormState,
} from './actions';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  unstable_rethrow: (error: unknown) => {
    if (error instanceof Error && error.message.startsWith('NEXT_REDIRECT')) throw error;
  },
}));
vi.mock('@/lib/authenticated-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/authenticated-api')>()),
  authenticatedApi: vi.fn(),
}));

const api = vi.mocked(authenticatedApi);
const empty: UserFormState = { feedback: null, fieldErrors: {}, values: { name: '', email: '', role: 'VENDEDOR' } };

function form(fields: Record<string, string>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

test('invitar valida nombre, correo y rol sin llamar al API y conserva lo escrito', async () => {
  expect(await inviteUser(empty, form({ name: ' Ana2 ', email: 'ana@empresa', role: 'ROOT' }))).toEqual({
    feedback: null,
    fieldErrors: {
      name: 'El nombre solo puede tener letras, espacios, apóstrofos, guiones y puntos.',
      email: 'Escribe un correo válido, por ejemplo nombre@empresa.ec.',
      role: 'Elige un rol válido.',
    },
    values: { name: 'Ana2', email: 'ana@empresa', role: 'ROOT' },
  });
  expect(api).not.toHaveBeenCalled();
});

test('invitar envía los datos normalizados, avisa del éxito y vacía el formulario', async () => {
  api.mockResolvedValue(new Response('{}', { status: 201 }));
  const state = await inviteUser(empty, form({ name: '  Ana   López ', email: ' Ana@Empresa.EC ', role: 'VENDEDOR' }));
  expect(api).toHaveBeenCalledWith('/users', {
    method: 'POST',
    body: JSON.stringify({ name: 'Ana López', email: 'ana@empresa.ec', role: 'VENDEDOR' }),
  });
  expect(state).toEqual({
    feedback: { tone: 'success', message: 'Invitación enviada.' },
    fieldErrors: {},
    values: { name: '', email: '', role: 'VENDEDOR' },
  });
  expect(revalidatePath).toHaveBeenCalledWith('/usuarios');
});

test('si el API rechaza la invitación muestra su motivo y conserva lo escrito', async () => {
  api.mockResolvedValue(Response.json({ error: { message: 'Ya existe una cuenta con ese correo.' } }, { status: 409 }));
  const state = await inviteUser(empty, form({ name: 'Ana López', email: 'ana@empresa.ec', role: 'ADMIN' }));
  expect(state.feedback).toEqual({ tone: 'error', message: 'Ya existe una cuenta con ese correo.' });
  expect(state.values).toEqual({ name: 'Ana López', email: 'ana@empresa.ec', role: 'ADMIN' });
  expect(revalidatePath).not.toHaveBeenCalled();
});

test('editar usa el id codificado y conserva los valores guardados', async () => {
  api.mockResolvedValue(new Response('{}', { status: 200 }));
  const state = await updateUser(
    empty,
    form({ id: 'id/raro', name: 'Ana López', email: 'ana@empresa.ec', role: 'ADMIN' }),
  );
  expect(api).toHaveBeenCalledWith('/users/id%2Fraro', expect.objectContaining({ method: 'PATCH' }));
  expect(state.feedback).toEqual({ tone: 'success', message: 'Usuario actualizado.' });
  expect(state.values.name).toBe('Ana López');
});

test('las acciones de fila llaman a su endpoint y devuelven un aviso claro', async () => {
  api.mockResolvedValue(new Response(null, { status: 200 }));
  for (const [action, path, method, message] of [
    [deactivateUser, '/users/u1/deactivate', 'PATCH', 'Usuario desactivado.'],
    [reactivateUser, '/users/u1/reactivate', 'PATCH', 'Usuario reactivado.'],
    [resendInvitation, '/users/u1/resend-invitation', 'POST', 'Invitación reenviada.'],
    [deleteUser, '/users/u1', 'DELETE', 'Usuario eliminado.'],
  ] as const) {
    expect(await action(form({ id: 'u1' }))).toEqual({ tone: 'success', message });
    expect(api).toHaveBeenLastCalledWith(path, { method });
  }
});

test('un error del API o de red se explica; una sesión vencida sigue su redirección al login', async () => {
  api.mockResolvedValueOnce(
    Response.json({ error: { message: 'Debe permanecer al menos un administrador activo.' } }, { status: 403 }),
  );
  expect(await deactivateUser(form({ id: 'u1' }))).toEqual({
    tone: 'error',
    message: 'Debe permanecer al menos un administrador activo.',
  });

  api.mockRejectedValueOnce(new TypeError('fetch failed'));
  expect(await deleteUser(form({ id: 'u1' }))).toEqual({
    tone: 'error',
    message: 'No pudimos conectar con el servidor. Inténtalo de nuevo.',
  });

  api.mockRejectedValueOnce(new Error('NEXT_REDIRECT /login?sesion=expirada'));
  await expect(reactivateUser(form({ id: 'u1' }))).rejects.toThrow('NEXT_REDIRECT /login?sesion=expirada');
});
