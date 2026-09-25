import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import ActividadesPage from './actividades/page';
import ContactsPage from './contactos/page';
import CotizacionesPage from './cotizaciones/page';
import EmpresasPage from './empresas/page';
import PipelinePage from './pipeline/page';
import ReportesPage from './reportes/page';

test('pipeline y contactos muestran sus datos de demostración', () => {
  const pipeline = render(<PipelinePage />);
  expect(screen.getByRole('region', { name: 'Resumen comercial' })).toHaveTextContent('Negocios abiertos');
  expect(screen.getByRole('region', { name: 'Etapas del pipeline' })).toHaveTextContent('Negociación');
  pipeline.unmount();

  render(<ContactsPage />);
  expect(screen.getByRole('table')).toHaveTextContent('María Cordero');
  expect(screen.getByRole('textbox', { name: 'Buscar contacto' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Importar CSV' })).toHaveAttribute('href', '/contactos/importar');
});

test('las secciones del próximo sprint lo anuncian', () => {
  for (const [Page, title] of [
    [ActividadesPage, 'Agenda comercial'],
    [CotizacionesPage, 'Cotizaciones'],
    [EmpresasPage, 'Directorio de empresas'],
    [ReportesPage, 'Reportes comerciales'],
  ] as const) {
    const view = render(<Page />);
    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument();
    view.unmount();
  }
});
