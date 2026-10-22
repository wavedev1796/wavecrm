import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { inviteUser } from './actions';
import { InviteUserForm } from './invite-user-form';
import { UsersFeedbackProvider } from './users-feedback';

vi.mock('./actions', () => ({ inviteUser: vi.fn() }));
const inviteMock = vi.mocked(inviteUser);

function setup() {
  render(
    <UsersFeedbackProvider>
      <InviteUserForm />
    </UsersFeedbackProvider>,
  );
  return userEvent.setup();
}

test('marca los campos con error y conserva lo escrito', async () => {
  inviteMock.mockResolvedValue({
    feedback: null,
    fieldErrors: {
      name: 'El nombre solo puede tener letras, espacios, apóstrofos, guiones y puntos.',
      email: 'Escribe un correo válido, por ejemplo nombre@empresa.ec.',
    },
    values: { name: 'Ana2', email: 'ana@empresa', role: 'VENDEDOR' },
  });
  const user = setup();
  await user.type(screen.getByLabelText('Nombre'), 'Ana2');
  await user.type(screen.getByLabelText('Correo'), 'ana@empresa');
  await user.click(screen.getByRole('button', { name: 'Enviar invitación' }));

  expect(
    await screen.findByText('El nombre solo puede tener letras, espacios, apóstrofos, guiones y puntos.'),
  ).toBeInTheDocument();
  expect(screen.getByLabelText('Nombre')).toHaveValue('Ana2');
  expect(screen.getByLabelText('Nombre')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByLabelText('Correo')).toHaveAccessibleDescription(
    'Escribe un correo válido, por ejemplo nombre@empresa.ec.',
  );
});

test('un rechazo del API se muestra junto al formulario y conserva lo escrito', async () => {
  inviteMock.mockResolvedValue({
    feedback: { tone: 'error', message: 'Ya existe una cuenta con ese correo.' },
    fieldErrors: {},
    values: { name: 'Ana López', email: 'ana@empresa.ec', role: 'VENDEDOR' },
  });
  const user = setup();
  await user.click(screen.getByRole('button', { name: 'Enviar invitación' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una cuenta con ese correo.');
  expect(screen.getByLabelText('Correo')).toHaveValue('ana@empresa.ec');
});

test('al invitar con éxito avisa en la página y vacía el formulario', async () => {
  inviteMock.mockResolvedValue({
    feedback: { tone: 'success', message: 'Invitación enviada.' },
    fieldErrors: {},
    values: { name: '', email: '', role: 'VENDEDOR' },
  });
  const user = setup();
  await user.type(screen.getByLabelText('Nombre'), 'Ana López');
  await user.click(screen.getByRole('button', { name: 'Enviar invitación' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Invitación enviada.');
  expect(screen.getByLabelText('Nombre')).toHaveValue('');
});

test('no usa la validación del navegador y limita las longitudes', () => {
  setup();
  expect(screen.getByRole('button', { name: 'Enviar invitación' }).closest('form')).toHaveAttribute('novalidate');
  expect(screen.getByLabelText('Nombre')).toHaveAttribute('maxlength', '100');
  expect(screen.getByLabelText('Correo')).toHaveAttribute('maxlength', '64');
});
