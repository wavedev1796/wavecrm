import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import ActividadesPage from "./actividades/page";
import CotizacionesPage from "./cotizaciones/page";
import EmpresasPage from "./empresas/page";
import PipelinePage from "./pipeline/page";
import ReportesPage from "./reportes/page";

test("pipeline muestra sus datos de demostración", () => {
  render(<PipelinePage />);
  expect(
    screen.getByRole("region", { name: "Resumen comercial" }),
  ).toHaveTextContent("Negocios abiertos");
  expect(
    screen.getByRole("region", { name: "Etapas del pipeline" }),
  ).toHaveTextContent("Negociación");
});

test("las secciones del próximo sprint lo anuncian", () => {
  for (const [Page, title] of [
    [ActividadesPage, "Agenda comercial"],
    [CotizacionesPage, "Cotizaciones"],
    [EmpresasPage, "Directorio de empresas"],
    [ReportesPage, "Reportes comerciales"],
  ] as const) {
    const view = render(<Page />);
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    view.unmount();
  }
});
