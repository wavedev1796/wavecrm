import { render, screen, within } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { authenticatedApi } from '@/lib/authenticated-api';
import UsersPage from './page';

vi.mock('@/lib/authenticated-api', () => ({ authenticatedApi: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
}));
vi.mock('./actions', () => ({
  inviteUser: vi.fn(),
  updateUser: vi.fn(),
  deactivateUser: vi.fn(),
  reactivateUser: vi.fn(),
  resendInvitation: vi.fn(),
  deleteUser: vi.fn(),
}));

const api = vi.mocked(authenticatedApi);
const people = [
  { id: 'admin', name: 'Admin Wave', email: 'admin@wave.ec', role: 'ADMIN', active: true, status: 'active', invitationSentAt: null, invitationExpiresAt: null },
  { id: 'u2', name: 'Ana López', email: 'ana@empresa.ec', role: 'VENDEDOR', active: true, status: 'active', invitationSentAt: '2026-09-10T12:00:00.000Z', invitationExpiresAt: null },
  { id: 'u3', name: 'Luis Pérez', email: 'luis@empresa.ec', role: 'VENDEDOR', active: false, status: 'pending', invitationSentAt: '2026-09-18T12:00:00.000Z', invitationExpiresAt: '2026-09-20T12:00:00.000Z' },
  { id: 'u4', name: 'Eva Ruiz', email: 'eva@empresa.ec', role: 'VENDEDOR', active: false, status: 'inactive', invitationSentAt: null, invitationExpiresAt: null },
];

function respond({ role = 'ADMIN', list }: { role?: string; list?: Response } = {}) {
  api.mockImplementation(async (path: string) =>
    path === '/auth/me'
      ? Response.json({ id: 'admin', role })
      : (list ?? Response.json({ data: people, meta: { total: people.length } })),
  );
}

const open = async (params: Record<string, string> = {}) =>
  render(await UsersPage({ searchParams: Promise.resolve(params) }));
const row = (email: string) => within(screen.getByRole('row', { name: new RegExp(email) }));

test('un vendedor no puede ver la página', async () => {
  respond({ role: 'VENDEDOR' });
  await expect(UsersPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('NEXT_REDIRECT /pipeline');
});

test('lista usuarios con su estado y solo las acciones que corresponden', async () => {
  respond();
  await open();
  expect(row('admin@wave.ec').queryByRole('button', { name: 'Desactivar' })).toBeNull();
  expect(row('admin@wave.ec').queryByRole('button', { name: 'Eliminar' })).toBeNull();
  expect(row('ana@empresa.ec').getByRole('button', { name: 'Desactivar' })).toBeInTheDocument();
  expect(row('luis@empresa.ec').getByText('Invitación pendiente')).toBeInTheDocument();
  expect(row('luis@empresa.ec').getByRole('button', { name: 'Reenviar invitación' })).toBeInTheDocument();
  expect(row('eva@empresa.ec').getByRole('button', { name: 'Reactivar' })).toBeInTheDocument();
  expect(screen.getByText('Total').nextSibling).toHaveTextContent('4');
});

test('pasa al API solo filtros válidos y limita la búsqueda a 100 caracteres', async () => {
  respond();
  await open({ search: 'ana', status: 'borrado' });
  expect(api).toHaveBeenCalledWith('/users?page=1&limit=100&search=ana');
  expect(screen.getByRole('textbox', { name: 'Buscar usuario' })).toHaveAttribute('maxlength', '100');
});

test('si la lista no carga lo dice, en vez de mostrar "no hay usuarios"', async () => {
  respond({ list: Response.json({ error: { message: 'x' } }, { status: 500 }) });
  await open();
  expect(screen.getByRole('alert')).toHaveTextContent('No pudimos cargar los usuarios. Recarga la página.');
  expect(screen.queryByText('No hay usuarios que coincidan con el filtro.')).toBeNull();
});

test('ignora mensajes escritos en la URL: nadie puede falsificar un aviso', async () => {
  respond();
  await open({ error: 'Tu cuenta fue bloqueada', success: 'Todo bien' });
  expect(screen.queryByText('Tu cuenta fue bloqueada')).toBeNull();
  expect(screen.queryByText('Todo bien')).toBeNull();
});
