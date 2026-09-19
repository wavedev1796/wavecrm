import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test, vi } from 'vitest';
import { activateAccount } from './actions';
import { ActivationForm } from './activation-form';

vi.mock('./actions', () => ({ activateAccount: vi.fn() }));
const activateMock = vi.mocked(activateAccount);

function setup() {
  render(<ActivationForm token="t" />);
  return userEvent.setup();
}

test('muestra las 5 reglas y las marca mientras se escribe', async () => {
  const user = setup();
  const rules = within(screen.getByRole('list', { name: 'Requisitos de la contraseña' })).getAllByRole('listitem');
  expect(rules).toHaveLength(5);
  expect(rules.every((rule) => rule.dataset.met === 'false')).toBe(true);
  await user.type(screen.getByLabelText('Contraseña'), 'Wave2026!');
  expect(rules.every((rule) => rule.dataset.met === 'true')).toBe(true);
});

test('avisa del desajuste al salir del campo y no envía el formulario', async () => {
  const user = setup();
  await user.type(screen.getByLabelText('Contraseña'), 'Wave2026!');
  await user.type(screen.getByLabelText('Confirmar contraseña'), 'Wave2026?');
  await user.tab();
  expect(screen.getByLabelText('Confirmar contraseña')).toHaveAccessibleDescription('Las contraseñas no coinciden.');
  await user.click(screen.getByRole('button', { name: 'Activar mi cuenta' }));
  expect(activateMock).not.toHaveBeenCalled();
});

test('muestra los errores del servidor en la alerta y junto al campo', async () => {
  activateMock.mockResolvedValue({
    error: 'La invitación no existe, venció o ya fue utilizada.',
    fieldErrors: { password: 'La contraseña debe tener entre 8 y 16 caracteres.' },
  });
  const user = setup();
  await user.click(screen.getByRole('button', { name: 'Activar mi cuenta' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('La invitación no existe, venció o ya fue utilizada.');
  expect(screen.getByLabelText('Contraseña')).toHaveAttribute('aria-invalid', 'true');
  expect(screen.getByText('La contraseña debe tener entre 8 y 16 caracteres.')).toBeInTheDocument();
});

test('no usa la validación del navegador y limita las contraseñas a 16 caracteres', () => {
  setup();
  expect(screen.getByRole('button', { name: 'Activar mi cuenta' }).closest('form')).toHaveAttribute('novalidate');
  expect(screen.getByLabelText('Contraseña')).toHaveAttribute('maxlength', '16');
  expect(screen.getByLabelText('Confirmar contraseña')).toHaveAttribute('maxlength', '16');
});
