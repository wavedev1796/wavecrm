import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { usePathname } from 'next/navigation';
import { expect, test, vi } from 'vitest';
import { AppShell } from './app-shell';

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }));
vi.mock('@/app/(auth)/actions', () => ({ logout: vi.fn() }));
const pathname = vi.mocked(usePathname);

test('un administrador ve Usuarios, la página actual marcada y su título', () => {
  pathname.mockReturnValue('/usuarios');
  render(
    <AppShell user={{ name: 'Ana López', email: 'ana@wave.ec', role: 'ADMIN' }}>
      <p>Contenido</p>
    </AppShell>,
  );
  expect(screen.getByRole('link', { name: 'Usuarios' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('link', { name: 'Pipeline' })).not.toHaveAttribute('aria-current');
  expect(screen.getByRole('heading', { level: 1, name: 'Usuarios' })).toBeInTheDocument();
  expect(screen.getByText('Cuentas y accesos del equipo')).toBeInTheDocument();
  expect(screen.getByText('AL')).toBeInTheDocument();
  expect(screen.getByText('Administrador')).toBeInTheDocument();
  expect(screen.getByText('Contenido')).toBeInTheDocument();
});

test('un vendedor no ve Usuarios', () => {
  pathname.mockReturnValue('/contactos');
  render(
    <AppShell user={{ name: 'Luis', email: 'luis@wave.ec', role: 'VENDEDOR' }}>
      <p>Contenido</p>
    </AppShell>,
  );
  expect(screen.queryByRole('link', { name: 'Usuarios' })).toBeNull();
  expect(screen.getByRole('link', { name: 'Contactos' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByText('Vendedor')).toBeInTheDocument();
});

test('sin datos de la persona y en una ruta desconocida usa valores seguros', () => {
  pathname.mockReturnValue('/desconocida');
  render(
    <AppShell user={null}>
      <p>Contenido</p>
    </AppShell>,
  );
  expect(screen.getByText('Usuario')).toBeInTheDocument();
  expect(screen.getByText('W')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1, name: 'Pipeline de ventas' })).toBeInTheDocument();
});

test('el menú móvil se abre y se cierra, y el cierre de sesión es un envío de formulario', async () => {
  pathname.mockReturnValue('/pipeline');
  render(
    <AppShell user={null}>
      <p>Contenido</p>
    </AppShell>,
  );
  const user = userEvent.setup();
  const sidebar = screen.getByRole('complementary', { name: 'Navegación principal' });
  await user.click(screen.getByRole('button', { name: 'Abrir menú' }));
  expect(sidebar).toHaveClass('sidebar--open');

  const [, backdrop] = screen.getAllByRole('button', { name: 'Cerrar menú' });
  await user.click(backdrop as HTMLElement);
  expect(sidebar).not.toHaveClass('sidebar--open');
  expect(screen.getByRole('button', { name: 'Cerrar sesión' })).toHaveAttribute('type', 'submit');
});
