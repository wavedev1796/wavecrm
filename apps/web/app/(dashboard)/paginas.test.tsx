import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import ActividadesPage from "./actividades/page";
import CotizacionesPage from "./cotizaciones/page";
import ReportesPage from "./reportes/page";

vi.mock("@/lib/authenticated-api", () => ({
  authenticatedApi: vi.fn(async (path: string) =>
    path.startsWith("/activities")
      ? Response.json({ data: [], meta: { pending: 0, overdue: 0 } })
      : Response.json([{ id: "u1", name: "Ana" }]),
  ),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

test("la agenda de actividades carga una lista real y las otras secciones pendientes se anuncian", async () => {
  const activities = render(
    await ActividadesPage({ searchParams: Promise.resolve({}) }),
  );
  expect(
    screen.getByRole("heading", { name: "Agenda del equipo" }),
  ).toBeInTheDocument();
  expect(
    screen.getByText("No hay actividades en este rango"),
  ).toBeInTheDocument();
  activities.unmount();
  for (const [Page, title] of [
    [CotizacionesPage, "Cotizaciones"],
    [ReportesPage, "Reportes comerciales"],
  ] as const) {
    const view = render(<Page />);
    expect(screen.getByRole("heading", { name: title })).toBeInTheDocument();
    view.unmount();
  }
});
