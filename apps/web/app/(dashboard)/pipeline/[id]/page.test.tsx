import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import { baseDeal } from "../deal-fixture";
import DealPage from "./page";

vi.mock("@/lib/authenticated-api", () => ({ authenticatedApi: vi.fn(), apiError: async () => "x" }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), unstable_rethrow: vi.fn(), useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../data", () => ({
  dealFormOptions: async () => ({ pipelines: [], contacts: [], companies: [], users: [] }),
}));
// Todas las acciones que importan los componentes de la ficha (ActivityForm hace .bind al renderizar).
vi.mock("../actions", () => ({
  saveDeal: vi.fn(),
  saveDealItemsAction: vi.fn(),
  previewTransitionAction: vi.fn(),
  completeTransitionAction: vi.fn(),
  qualifyDealAction: vi.fn(),
  createQuoteAction: vi.fn(),
  acceptQuoteAction: vi.fn(),
  createActivityAction: vi.fn(),
  completeActivityAction: vi.fn(),
}));
const api = vi.mocked(authenticatedApi);
/** La ficha pide el negocio y quién mira (su rol decide si puede reabrir). */
function serve(deal: unknown, role = "ADMIN") {
  api.mockImplementation(async (path) => (path === "/auth/me" ? Response.json({ id: "u1", role }) : Response.json(deal)));
}

test("la ficha abierta muestra valor, productos, empresa enlazada y botones de cierre", async () => {
  serve({ ...baseDeal, stage: { ...baseDeal.stage, color: "#2f8f5b" } });
  const { container } = render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  expect(container.querySelector(".deal-stage-dot")).toHaveStyle({ background: "#2f8f5b" });
  expect(api).toHaveBeenCalledWith("/deals/d1");
  expect(screen.getByRole("heading", { name: "Cuenta Andina" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Comercial Andina" })).toHaveAttribute("href", "/empresas/e1");
  expect(screen.getByLabelText("Descripción del producto 1")).toHaveValue("Chocolates");
  expect(screen.getByRole("button", { name: "Ganar" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Perder" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Calificación" })).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /Propuestas/ })).toBeInTheDocument();
});

test("un ganado muestra fecha de ganado, su cotizacion y productos bloqueados", async () => {
  const won = {
    ...baseDeal,
    status: "WON",
    closedAt: "2026-10-05T00:00:00.000Z",
    quotes: [{ id: "q1", number: "COT-000001", status: "ACCEPTED", subtotal: "120.00", tax: "15.00", total: "135.00", createdAt: "2026-10-05T12:00:00.000Z" }],
  };
  serve(won);
  const { unmount } = render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  expect(screen.getByText(/COT-000001 · Aceptada · .*135,00/)).toBeInTheDocument();
  expect(screen.getByText("Ganado el")).toBeInTheDocument();
  expect(screen.getByText("Reabre el negocio para cambiar sus productos.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reabrir" })).toBeInTheDocument();
  unmount();
  serve(won, "VENDEDOR");
  render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  expect(screen.queryByRole("button", { name: "Reabrir" })).toBeNull();
});

test("un perdido muestra su motivo y detalle", async () => {
  serve({ ...baseDeal, status: "LOST", closedAt: "2026-10-05T00:00:00.000Z", lossReason: "OTHER", lossDetail: "Cerro el local" });
  render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  expect(screen.getByText("Otro")).toBeInTheDocument();
  expect(screen.getByText("Cerro el local")).toBeInTheDocument();
});

test("al ganar, la tabla de productos vuelve a leer lo del servidor y no conserva filas editadas", async () => {
  serve(baseDeal);
  const { rerender } = render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Descripción del producto 1"), " editado sin guardar");
  serve({
    ...baseDeal,
    status: "WON",
    closedAt: "2026-10-05T00:00:00.000Z",
    items: baseDeal.items.map((item) => ({ ...item, id: item.id + "-guardado" })),
  });
  rerender(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  expect(screen.queryByText(/editado sin guardar/)).toBeNull();
  expect(screen.getByText("Chocolates")).toBeInTheDocument();
});
