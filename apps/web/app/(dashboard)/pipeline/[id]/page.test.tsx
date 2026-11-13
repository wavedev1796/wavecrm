import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import { baseDeal } from "../../../../features/pipeline/deal-fixture";
import { apiPage, pendingCall } from "../../../../features/timeline/timeline-fixture";
import DealPage from "./page";

vi.mock("@/lib/authenticated-api", () => ({ authenticatedApi: vi.fn(), apiError: async () => "x" }));
vi.mock("next/navigation", () => ({ notFound: vi.fn(), unstable_rethrow: vi.fn(), useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("../../../../features/pipeline/data", () => ({
  dealFormOptions: async () => ({ pipelines: [], contacts: [], companies: [], users: [] }),
}));
// Todas las acciones que importan los componentes de la ficha (el bloque de actividad usa createActivityAction).
vi.mock("../../../../features/pipeline/actions", () => ({
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
/** La ficha pide el negocio, quién mira (su rol decide si puede reabrir) y la primera página del historial. */
function serve(deal: unknown, role = "ADMIN", timeline: unknown = apiPage([])) {
  api.mockImplementation(async (path) => {
    if (path === "/auth/me") return Response.json({ id: "u1", role });
    if (path.endsWith("/timeline")) return typeof timeline === "number" ? new Response(null, { status: timeline }) : Response.json(timeline);
    return Response.json(deal);
  });
}

test("la ficha abierta muestra valor, productos, empresa enlazada y botones de cierre", async () => {
  serve({ ...baseDeal, stage: { ...baseDeal.stage, color: "#2f8f5b" } });
  const { container } = render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  expect(container.querySelector(".deal-stage-dot")).toHaveStyle({ background: "#2f8f5b" });
  // Sin las etapas del pipeline (mock vacío), la barra muestra al menos la etapa actual con su color.
  const avance = screen.getByRole("progressbar", { name: "Avance del negocio" });
  expect(avance).toHaveAttribute("aria-valuetext", "Propuesta · 70 %");
  expect(avance.querySelector(".stage-progress-step")).toHaveStyle({ background: "#2f8f5b" });
  expect(api).toHaveBeenCalledWith("/deals/d1");
  expect(screen.getByRole("heading", { name: "Cuenta Andina" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Comercial Andina" })).toHaveAttribute("href", "/empresas/e1");
  expect(container.querySelector(".deal-items--summary")).toHaveTextContent("Chocolates");
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
  expect(screen.getByText("COT-000001")).toBeInTheDocument();
  expect(screen.getByText("Aceptada")).toBeInTheDocument();
  expect(screen.getAllByText(/135,00/).length).toBeGreaterThan(0);
  expect(screen.getByText("Ganado el")).toBeInTheDocument();
  expect(screen.getByText("Reversa el negocio para cambiar sus productos.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reversar" })).toBeInTheDocument();
  unmount();
  serve(won, "VENDEDOR");
  render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  expect(screen.queryByRole("button", { name: "Reversar" })).toBeNull();
});

test("un perdido muestra su motivo y detalle", async () => {
  serve({ ...baseDeal, status: "LOST", closedAt: "2026-10-05T00:00:00.000Z", lossReason: "OTHER", lossDetail: "Cerro el local" });
  render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  expect(screen.getByText("Otro")).toBeInTheDocument();
  expect(screen.getByText("Cerro el local")).toBeInTheDocument();
});

test("un rechazado muestra su cierre, bloquea productos y actividades y solo un ADMIN lo reabre", async () => {
  serve({ ...baseDeal, status: "REJECTED", closedAt: "2026-10-05T00:00:00.000Z", lossReason: "COMMERCIAL_RISK", lossDetail: null }, "VENDEDOR");
  render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  expect(screen.getAllByText("Rechazado").length).toBeGreaterThan(0);
  expect(screen.getByText("Rechazado el")).toBeInTheDocument();
  expect(screen.getByText("Riesgo comercial")).toBeInTheDocument();
  expect(screen.getByText("Reversa el negocio para cambiar sus productos.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Registrar actividad" })).toBeNull();
  expect(screen.queryByRole("button", { name: /Reversar|Enmendar|Ganar|Perder/ })).toBeNull();
});

test("al ganar, la tabla de productos vuelve a leer lo del servidor y no conserva filas editadas", async () => {
  serve(baseDeal);
  const { rerender, container } = render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Editar líneas" }));
  await user.type(screen.getByLabelText("Descripción del producto 1"), " editado sin guardar");
  serve({
    ...baseDeal,
    status: "WON",
    closedAt: "2026-10-05T00:00:00.000Z",
    items: baseDeal.items.map((item) => ({ ...item, id: item.id + "-guardado" })),
  });
  rerender(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  expect(screen.queryByText(/editado sin guardar/)).toBeNull();
  expect(container.querySelector(".deal-items--summary")).toHaveTextContent("Chocolates");
});

test("el historial llega del API ya armado y sus pendientes se completan en la ficha", async () => {
  serve(baseDeal, "ADMIN", apiPage([pendingCall], "k1"));
  render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  expect(api).toHaveBeenCalledWith("/deals/d1/timeline");
  expect(screen.getByText("Llamar a Maria")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Completar Llamar a Maria" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Abrir historial completo" })).toBeInTheDocument();
});

test("un VENDEDOR sin acceso al historial ve la ficha, el aviso y el formulario de actividad", async () => {
  serve(baseDeal, "VENDEDOR", 404);
  render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  expect(screen.getByRole("heading", { name: "Cuenta Andina" })).toBeInTheDocument();
  expect(screen.getByText("No tienes acceso al historial de este registro.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Registrar actividad" })).toBeInTheDocument();
});
