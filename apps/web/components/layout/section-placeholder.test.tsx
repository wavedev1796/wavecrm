import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { SectionPlaceholder } from './section-placeholder';

test('anuncia la sección y que llega en el próximo sprint', () => {
  render(<SectionPlaceholder title="Reportes" description="Métricas del equipo." />);
  expect(screen.getByRole('heading', { name: 'Reportes' })).toBeInTheDocument();
  expect(screen.getByText('Métricas del equipo.')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Disponible en el próximo sprint' })).toBeDisabled();
});
