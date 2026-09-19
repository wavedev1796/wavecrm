import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { FieldError, invalidProps } from './field-error';

test('sin mensaje no pinta nada y el input queda sin marcas', () => {
  const { container } = render(<FieldError id="email" message={null} />);
  expect(container).toBeEmptyDOMElement();
  expect(invalidProps('email', null)).toEqual({});
});

test('con mensaje, el input queda inválido y enlazado al error', () => {
  render(
    <>
      <input aria-label="Correo" {...invalidProps('email', 'Ingresa tu correo.')} />
      <FieldError id="email" message="Ingresa tu correo." />
    </>,
  );
  const input = screen.getByLabelText('Correo');
  expect(input).toHaveAttribute('aria-invalid', 'true');
  expect(input).toHaveAccessibleDescription('Ingresa tu correo.');
});
