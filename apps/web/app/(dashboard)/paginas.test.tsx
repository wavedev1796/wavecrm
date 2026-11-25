import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import ActividadesPage from "./actividades/page";
import ConfiguracionPage from "./configuracion/page";
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
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
}));
vi.mock("../../features/configuracion/actions", () => ({ saveSettingsAction: vi.fn() }));

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

/** /auth/me dice el rol; /settings, el IVA general. */
function serveSettings(role: string) {
  vi.mocked(authenticatedApi).mockImplementation(async (path: string) =>
    path === "/auth/me" ? Response.json({ id: "u1", role }) : Response.json({ taxRate: 12 }),
  );
}

test("configuración: un administrador ve el IVA general guardado", async () => {
  serveSettings("ADMIN");
  render(await ConfiguracionPage());
  expect(screen.getByLabelText(/IVA general/)).toHaveValue("12");
});

test("configuración: quien no es administrador vuelve al pipeline", async () => {
  serveSettings("VENDEDOR");
  await expect(ConfiguracionPage()).rejects.toThrow("NEXT_REDIRECT /pipeline");
});
