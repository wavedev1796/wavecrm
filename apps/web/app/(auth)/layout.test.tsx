import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import AuthLayout from './layout';

test('enmarca el formulario con la marca y una vista de ejemplo', () => {
  render(
    <AuthLayout>
      <h1>Formulario</h1>
    </AuthLayout>,
  );
  expect(screen.getByRole('main')).toHaveTextContent('Formulario');
  expect(screen.getByText('Wave', { selector: '.sr-only' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Ejemplo de un negocio en Wave CRM' })).toHaveTextContent(
    'Vista de ejemplo',
  );
  expect(screen.getByText('© 2026 Wave · thewavesea.com')).toBeInTheDocument();
});
