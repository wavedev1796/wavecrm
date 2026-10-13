import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { login } from '../actions';
import { LoginForm } from './login-form';

vi.mock('../actions', () => ({ login: vi.fn() }));
const loginMock = vi.mocked(login);

test('marca cada campo con su error y conserva el correo escrito', async () => {
  loginMock.mockResolvedValue({
    email: 'ana@empresa',
    error: null,
    fieldErrors: {
      email: 'Escribe un correo válido, por ejemplo nombre@empresa.ec.',
      password: 'Ingresa tu contraseña.',
    },
  });
  render(<LoginForm />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Entrar' }));

  expect(await screen.findByText('Ingresa tu contraseña.')).toBeInTheDocument();
  const email = screen.getByLabelText('Correo');
  expect(email).toHaveValue('ana@empresa');
  expect(email).toHaveAttribute('aria-invalid', 'true');
  expect(email).toHaveAccessibleDescription('Escribe un correo válido, por ejemplo nombre@empresa.ec.');
  expect(screen.getByLabelText('Contraseña')).toHaveAccessibleDescription('Ingresa tu contraseña.');
});

test('muestra el motivo del servidor en una alerta', async () => {
  loginMock.mockResolvedValue({
    email: 'ana@empresa.ec',
    error: 'Tu cuenta está desactivada. Pide a un administrador que la reactive.',
    fieldErrors: {},
  });
  render(<LoginForm />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Tu cuenta está desactivada. Pide a un administrador que la reactive.',
  );
});

test('mientras espera, el botón indica que está entrando y no se puede pulsar dos veces', async () => {
  loginMock.mockReturnValue(new Promise(() => {}));
  render(<LoginForm />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Entrar' }));
  expect(await screen.findByRole('button', { name: 'Entrando…' })).toBeDisabled();
});

test('no usa la validación del navegador, limita longitudes y enlaza la recuperación', () => {
  render(<LoginForm />);
  expect(screen.getByRole('button', { name: 'Entrar' }).closest('form')).toHaveAttribute('novalidate');
  expect(screen.getByLabelText('Correo')).toHaveAttribute('maxlength', '64');
  expect(screen.getByLabelText('Contraseña')).toHaveAttribute('maxlength', '16');
  expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toHaveAttribute(
    'href',
    '/recuperar-contrasena',
  );
});
