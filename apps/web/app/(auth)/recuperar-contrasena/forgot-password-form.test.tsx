import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { requestPasswordReset } from './actions';
import { ForgotPasswordForm } from './forgot-password-form';

vi.mock('./actions', () => ({ requestPasswordReset: vi.fn() }));
const requestMock = vi.mocked(requestPasswordReset);

function setup() {
  render(<ForgotPasswordForm />);
  return userEvent.setup();
}

const send = async (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole('button', { name: 'Enviar enlace' }));

test('envía el correo escrito a la server action y confirma la solicitud', async () => {
  requestMock.mockResolvedValue({ requestedFor: 'ana@empresa.ec', error: null, fieldError: null });
  const user = setup();
  await user.type(screen.getByLabelText('Correo'), 'Ana@Empresa.EC');
  await send(user);

  expect(requestMock.mock.calls[0]?.[1].get('email')).toBe('Ana@Empresa.EC');
  expect(await screen.findByRole('heading', { name: 'Revisa tu correo' })).toBeInTheDocument();
  expect(screen.getByText('ana@empresa.ec')).toBeInTheDocument();
  // El envío ya no está pendiente: el aviso del sprint anterior desapareció.
  expect(screen.queryByText(/pendiente/i)).toBeNull();
});

test('muestra junto al campo el error que devuelve el servidor', async () => {
  requestMock.mockResolvedValue({
    requestedFor: null,
    error: null,
    fieldError: 'Escribe un correo válido, por ejemplo nombre@empresa.ec.',
  });
  const user = setup();
  await send(user);
  const email = screen.getByLabelText('Correo');
  expect(email).toHaveAttribute('aria-invalid', 'true');
  expect(email).toHaveAccessibleDescription('Escribe un correo válido, por ejemplo nombre@empresa.ec.');
});

test('muestra en una alerta el fallo del API y deja reintentar', async () => {
  requestMock.mockResolvedValue({
    requestedFor: null,
    fieldError: null,
    error: 'Demasiados intentos. Espera un minuto e inténtalo de nuevo.',
  });
  const user = setup();
  await send(user);
  expect(screen.getByRole('alert')).toHaveTextContent('Demasiados intentos. Espera un minuto e inténtalo de nuevo.');
  expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeInTheDocument();
});

test('no usa la validación del navegador, limita el correo y permite volver al login', () => {
  setup();
  expect(screen.getByRole('button', { name: 'Enviar enlace' }).closest('form')).toHaveAttribute('novalidate');
  expect(screen.getByLabelText('Correo')).toHaveAttribute('maxlength', '64');
  expect(screen.getByRole('link', { name: 'Volver al inicio de sesión' })).toHaveAttribute('href', '/login');
});
