import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import ActividadesPage from "./actividades/page";
import CotizacionesPage from "./cotizaciones/page";
import ReportesPage from "./reportes/page";

test("las secciones del próximo sprint lo anuncian", () => {
  for (const [Page, title] of [
    [ActividadesPage, "Agenda comercial"],
    [CotizacionesPage, "Cotizaciones"],
    [ReportesPage, "Reportes comerciales"],
  ] as const) {
    const view = render(<Page />);
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    view.unmount();
  }
});
