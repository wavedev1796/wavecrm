import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import ActividadesPage from "./actividades/page";
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
  render(<ReportesPage />);
  expect(screen.getByRole("heading", { name: "Reportes comerciales" })).toBeInTheDocument();
});
