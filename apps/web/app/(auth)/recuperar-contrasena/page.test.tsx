import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import RecuperarContrasenaPage from './page';

test('muestra el formulario de recuperación', () => {
  render(<RecuperarContrasenaPage />);
  expect(screen.getByRole('heading', { name: '¿Olvidaste tu contraseña?' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Enviar enlace' })).toBeInTheDocument();
});
