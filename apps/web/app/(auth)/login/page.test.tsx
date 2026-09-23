import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import LoginPage from './page';

vi.mock('../actions', () => ({ login: vi.fn() }));

const open = async (params: Record<string, string>) => render(await LoginPage({ searchParams: Promise.resolve(params) }));

test('avisa cuando la cuenta se acaba de activar', async () => {
  await open({ activated: '1' });
  expect(screen.getByRole('status')).toHaveTextContent('Tu cuenta fue activada. Ya puedes iniciar sesión.');
});

test('avisa cuando la sesión terminó', async () => {
  await open({ sesion: 'expirada' });
  expect(screen.getByRole('status')).toHaveTextContent('Tu sesión terminó. Vuelve a iniciar sesión.');
});

test('avisa cuando la contraseña se acaba de restablecer', async () => {
  await open({ contrasena: 'actualizada' });
  expect(screen.getByRole('status')).toHaveTextContent('Tu contraseña fue actualizada. Inicia sesión con tu nueva contraseña.');
});

test('un texto libre en la URL nunca se muestra como aviso', async () => {
  await open({ sesion: 'Tu cuenta fue bloqueada, llama al 0999999999' });
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.queryByText(/bloqueada/)).toBeNull();
  expect(screen.getByRole('heading', { name: 'Inicia sesión en tu cuenta' })).toBeInTheDocument();
});
