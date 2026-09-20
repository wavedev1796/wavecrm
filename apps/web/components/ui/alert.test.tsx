import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Alert } from './alert';

test('los errores se anuncian de inmediato y el resto sin interrumpir', () => {
  render(
    <>
      <Alert tone="error">Falló</Alert>
      <Alert tone="success" className="extra">
        Listo
      </Alert>
      <Alert tone="note" id="nota">
        Ojo
      </Alert>
    </>,
  );
  expect(screen.getByRole('alert')).toHaveTextContent('Falló');
  const [success, note] = screen.getAllByRole('status');
  expect(success).toHaveTextContent('Listo');
  expect(success).toHaveClass('alert', 'alert--success', 'extra');
  expect(note).toHaveAttribute('id', 'nota');
});
