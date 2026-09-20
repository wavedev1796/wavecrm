import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { authenticatedApi } from '@/lib/authenticated-api';
import DashboardLayout from './layout';

vi.mock('@/lib/authenticated-api', () => ({ authenticatedApi: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => '/pipeline' }));
vi.mock('@/app/(auth)/actions', () => ({ logout: vi.fn() }));

test('pasa al shell la persona que devuelve /auth/me', async () => {
  vi.mocked(authenticatedApi).mockResolvedValue(
    Response.json({ id: 'u1', name: 'Ana López', email: 'ana@wave.ec', role: 'ADMIN' }),
  );
  render(await DashboardLayout({ children: <p>Contenido</p> }));
  expect(authenticatedApi).toHaveBeenCalledWith('/auth/me');
  expect(screen.getByText('Ana López')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Usuarios' })).toBeInTheDocument();
  expect(screen.getByText('Contenido')).toBeInTheDocument();
});
