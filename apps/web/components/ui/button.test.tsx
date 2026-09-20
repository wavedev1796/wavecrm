import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Button } from './button';

test('por defecto es primario y se puede pulsar', () => {
  render(<Button>Guardar</Button>);
  const button = screen.getByRole('button', { name: 'Guardar' });
  expect(button).toHaveClass('button', 'button--primary');
  expect(button).toBeEnabled();
  expect(button).not.toHaveAttribute('aria-busy');
});

test('cargando muestra el spinner, se deshabilita y se marca ocupado', () => {
  const { container } = render(
    <Button variant="secondary" loading>
      Guardando
    </Button>,
  );
  const button = screen.getByRole('button', { name: 'Guardando' });
  expect(button).toBeDisabled();
  expect(button).toHaveAttribute('aria-busy', 'true');
  expect(button).toHaveClass('button--secondary');
  expect(container.querySelector('.button-spinner')).toHaveAttribute('aria-hidden', 'true');
});
