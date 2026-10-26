import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import TrashPage from "./page";

vi.mock("@/lib/authenticated-api", () => ({ authenticatedApi: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => "/pipeline/papelera" }));
vi.mock("../../../../features/pipeline/actions", () => ({
  deleteRejectedAction: vi.fn(),
  previewTransitionAction: vi.fn(),
  completeTransitionAction: vi.fn(),
  saveTransitionAction: vi.fn(),
}));
const api = vi.mocked(authenticatedApi);
const deal = {
  id: "d1",
  title: "Cuenta Andina",
  value: "500.00",
  currency: "USD",
  status: "REJECTED",
  contact: null,
  company: null,
  owner: null,
  pipeline: { id: "p1", name: "Ventas" },
  closedAt: "2026-10-20T00:00:00.000Z",
  lossReason: "OUT_OF_SCOPE",
  lossDetail: null,
};
function serve(role: string, list: Response = Response.json({ data: [deal], meta: { page: 2, limit: 20, total: 21, totalPages: 2 } })) {
  api.mockImplementation(async (path) => (path === "/auth/me" ? Response.json({ id: "u1", role }) : list));
}

test("pide los rechazados de la página y solo un ADMIN ve Reabrir", async () => {
  serve("ADMIN");
  const { unmount } = render(await TrashPage({ searchParams: Promise.resolve({ page: "2" }) }));
  const path = api.mock.calls.find(([p]) => p.startsWith("/deals?"))![0];
  expect(Object.fromEntries(new URLSearchParams(path.slice("/deals?".length)))).toEqual({ page: "2", limit: "20", status: "REJECTED" });
  expect(screen.getByRole("heading", { name: "Papelera" })).toBeInTheDocument();
  expect(screen.getByText("Solicitud fuera del alcance")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reabrir Cuenta Andina" })).toBeInTheDocument();
  unmount();
  serve("VENDEDOR");
  render(await TrashPage({ searchParams: Promise.resolve({}) }));
  expect(screen.queryByRole("button", { name: "Reabrir Cuenta Andina" })).toBeNull();
});

test("si el API falla muestra el error y el enlace de vuelta", async () => {
  serve("ADMIN", new Response(null, { status: 500 }));
  render(await TrashPage({ searchParams: Promise.resolve({}) }));
  expect(screen.getByText("No se pudo cargar la papelera. Intenta de nuevo.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Volver al pipeline" })).toHaveAttribute("href", "/pipeline");
});
