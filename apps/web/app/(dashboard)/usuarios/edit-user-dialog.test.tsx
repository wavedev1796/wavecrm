import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { updateUser } from './actions';
import { EditUserDialog } from './edit-user-dialog';
import { UsersFeedbackProvider } from './users-feedback';

vi.mock('./actions', () => ({ updateUser: vi.fn() }));
const updateMock = vi.mocked(updateUser);
const person = { id: 'u1', name: 'Ana López', email: 'ana@empresa.ec', role: 'VENDEDOR' as const };

async function openDialog() {
  render(
    <UsersFeedbackProvider>
      <EditUserDialog user={person} />
    </UsersFeedbackProvider>,
  );
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Editar Ana López' }));
  return user;
}

test('abre el diálogo con los datos actuales', async () => {
  await openDialog();
  expect(screen.getByRole('dialog', { name: 'Editar usuario' })).toHaveAttribute('open');
  expect(screen.getByLabelText('Nombre completo')).toHaveValue('Ana López');
  expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('maxlength', '64');
});

test('si hay errores los muestra en el diálogo y no lo cierra', async () => {
  updateMock.mockResolvedValue({
    feedback: { tone: 'error', message: 'Ya existe una cuenta con ese correo.' },
    fieldErrors: { name: 'El nombre debe tener entre 2 y 100 caracteres.' },
    values: { name: 'X', email: 'otra@empresa.ec', role: 'VENDEDOR' },
  });
  const user = await openDialog();
  await user.click(screen.getByRole('button', { name: 'Aplicar cambios' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Ya existe una cuenta con ese correo.');
  expect(screen.getByLabelText('Nombre completo')).toHaveAccessibleDescription(
    'El nombre debe tener entre 2 y 100 caracteres.',
  );
  expect(screen.getByRole('dialog', { name: 'Editar usuario' })).toHaveAttribute('open');
});

test('al guardar con éxito cierra el diálogo y avisa en la página', async () => {
  updateMock.mockResolvedValue({
    feedback: { tone: 'success', message: 'Usuario actualizado.' },
    fieldErrors: {},
    values: { name: 'Ana Pérez', email: 'ana@empresa.ec', role: 'VENDEDOR' },
  });
  const user = await openDialog();
  await user.click(screen.getByRole('button', { name: 'Aplicar cambios' }));
  expect(await screen.findByRole('status')).toHaveTextContent('Usuario actualizado.');
  expect(screen.getByRole('dialog', { hidden: true })).not.toHaveAttribute('open');
});
