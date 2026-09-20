import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, test } from 'vitest';
import { PasswordInput } from './password-input';

test('el botón muestra y oculta la contraseña sin cambiar su nombre', async () => {
  render(
    <>
      <label htmlFor="clave">Clave</label>
      <PasswordInput id="clave" />
    </>,
  );
  const input = screen.getByLabelText('Clave');
  const toggle = screen.getByRole('button', { name: 'Mostrar contraseña' });
  expect(input).toHaveAttribute('type', 'password');
  expect(toggle).toHaveAttribute('aria-pressed', 'false');
  expect(toggle).toHaveAttribute('aria-controls', 'clave');

  await userEvent.setup().click(toggle);
  expect(input).toHaveAttribute('type', 'text');
  expect(toggle).toHaveAttribute('aria-pressed', 'true');
});
