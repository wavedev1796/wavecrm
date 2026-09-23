import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import RestablecerContrasenaPage from './page';

vi.mock('./actions', () => ({ resetPassword: vi.fn() }));

const fetchMock = vi.fn();
beforeEach(() => vi.stubGlobal('fetch', fetchMock));

const open = async (params: Record<string, string> = {}) =>
  render(await RestablecerContrasenaPage({ searchParams: Promise.resolve(params) }));

test('sin token no consulta el API y explica que el enlace no está disponible', async () => {
  await open();
  expect(screen.getByRole('heading', { name: 'Enlace no disponible' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Pedir un enlace nuevo' })).toHaveAttribute(
    'href',
    '/recuperar-contrasena',
  );
  expect(fetchMock).not.toHaveBeenCalled();
});

test('con un enlace válido saluda por nombre y avisa de que cerrará las sesiones', async () => {
  fetchMock.mockResolvedValue(Response.json({ name: 'Ana López' }));
  await open({ token: 'token/raro' });
  expect(fetchMock).toHaveBeenCalledWith('http://localhost:4000/api/v1/auth/password-resets/token%2Fraro', {
    cache: 'no-store',
  });
  expect(screen.getByRole('heading', { name: 'Crea tu contraseña nueva' })).toBeInTheDocument();
  expect(screen.getByText('Ana López')).toBeInTheDocument();
  expect(screen.getByText(/se cerrarán las sesiones abiertas/)).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Guardar contraseña' })).toBeInTheDocument();
});

test('un enlace vencido o un API caído muestran el mismo aviso', async () => {
  fetchMock.mockResolvedValueOnce(Response.json({ error: { message: 'x' } }, { status: 400 }));
  const expired = await open({ token: 'vencido' });
  expect(screen.getByRole('heading', { name: 'Enlace no disponible' })).toBeInTheDocument();
  expired.unmount();

  fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
  await open({ token: 'cualquiera' });
  expect(screen.getByRole('heading', { name: 'Enlace no disponible' })).toBeInTheDocument();
});
