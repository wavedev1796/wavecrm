import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { ForgotPasswordForm } from './forgot-password-form';

function setup() {
  render(<ForgotPasswordForm />);
  return userEvent.setup();
}

test('pide el correo si se envía vacío', async () => {
  const user = setup();
  await user.click(screen.getByRole('button', { name: 'Enviar enlace' }));
  const email = screen.getByLabelText('Correo');
  expect(email).toHaveAttribute('aria-invalid', 'true');
  expect(email).toHaveAccessibleDescription('Ingresa tu correo.');
});

test('rechaza un correo sin extensión de dominio', async () => {
  const user = setup();
  await user.type(screen.getByLabelText('Correo'), 'ana@empresa');
  await user.click(screen.getByRole('button', { name: 'Enviar enlace' }));
  expect(screen.getByLabelText('Correo')).toHaveAccessibleDescription(
    'Escribe un correo válido, por ejemplo nombre@empresa.ec.',
  );
});

test('con un correo válido confirma la solicitud con el correo normalizado y avisa que el envío está pendiente', async () => {
  const user = setup();
  await user.type(screen.getByLabelText('Correo'), 'Ana@Empresa.EC');
  await user.click(screen.getByRole('button', { name: 'Enviar enlace' }));
  expect(screen.getByRole('heading', { name: 'Revisa tu correo' })).toBeInTheDocument();
  expect(screen.getByText('ana@empresa.ec')).toBeInTheDocument();
  expect(screen.getByText(/el envío del correo se habilita/)).toBeInTheDocument();
});

test('no usa la validación del navegador, limita el correo y permite volver al login', () => {
  setup();
  expect(screen.getByRole('button', { name: 'Enviar enlace' }).closest('form')).toHaveAttribute('novalidate');
  expect(screen.getByLabelText('Correo')).toHaveAttribute('maxlength', '64');
  expect(screen.getByRole('link', { name: 'Volver al inicio de sesión' })).toHaveAttribute('href', '/login');
});
