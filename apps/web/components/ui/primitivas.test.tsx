import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { Badge } from './badge';
import { Card } from './card';
import { Input } from './input';
import { Table } from './table';

test('Input, Badge, Card y Table añaden su clase y pasan el resto de props', () => {
  render(
    <>
      <Input aria-label="Campo" className="extra" maxLength={10} />
      <Badge>Azul</Badge>
      <Badge tone="warning">Aviso</Badge>
      <Card data-testid="tarjeta" className="kpi" />
      <Table aria-label="Datos">
        <tbody>
          <tr>
            <td>1</td>
          </tr>
        </tbody>
      </Table>
    </>,
  );
  expect(screen.getByLabelText('Campo')).toHaveClass('input', 'extra');
  expect(screen.getByLabelText('Campo')).toHaveAttribute('maxlength', '10');
  expect(screen.getByText('Azul')).toHaveClass('badge', 'badge--blue');
  expect(screen.getByText('Aviso')).toHaveClass('badge--warning');
  expect(screen.getByTestId('tarjeta')).toHaveClass('card', 'kpi');
  const table = screen.getByRole('table', { name: 'Datos' });
  expect(table).toHaveClass('table');
  expect(table.parentElement).toHaveClass('table-scroll');
});
