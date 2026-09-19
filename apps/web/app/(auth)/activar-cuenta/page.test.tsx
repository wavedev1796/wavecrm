import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import ActivateAccountPage from './page';

vi.mock('./actions', () => ({ activateAccount: vi.fn() }));

const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));

const open = async (params: Record<string, string> = {}) =>
  render(await ActivateAccountPage({ searchParams: Promise.resolve(params) }));

test('sin token no consulta el API y explica que la invitación no está disponible', async () => {
  await open();
  expect(screen.getByRole('heading', { name: 'Invitación no disponible' })).toBeInTheDocument();
  expect(fetchMock).not.toHaveBeenCalled();
});

test('con una invitación válida saluda por nombre y muestra el correo enmascarado', async () => {
  fetchMock.mockResolvedValue(Response.json({ name: 'Ana López', email: 'an***@empresa.ec' }));
  await open({ token: 'token/raro' });
  expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/api/v1/users/invitations/token%2Fraro', {
    cache: 'no-store',
  });
  expect(screen.getByRole('heading', { name: 'Activa tu cuenta' })).toBeInTheDocument();
  expect(screen.getByText('Ana López')).toBeInTheDocument();
  expect(screen.getByText('an***@empresa.ec')).toBeInTheDocument();
});

test('una invitación vencida o un API caído muestran el mismo aviso', async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ error: { message: 'x' } }, { status: 400 }));
  const expired = await open({ token: 'vencido' });
  expect(screen.getByRole('heading', { name: 'Invitación no disponible' })).toBeInTheDocument();
  expired.unmount();

  fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
  await open({ token: 'cualquiera' });
  expect(screen.getByRole('heading', { name: 'Invitación no disponible' })).toBeInTheDocument();
});
