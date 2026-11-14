import { render, screen, within } from "@testing-library/react";
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
  addPaymentAction: vi.fn(),
  deletePaymentAction: vi.fn(),
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
  const user = userEvent.setup();
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
  expect(screen.getByRole("tab", { name: "Resumen" })).toHaveAttribute("aria-selected", "true");
  expect(container.querySelector(".deal-overview-quote")).toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: /Productos y propuestas/ }));
  expect(container.querySelector(".deal-items--summary")).toHaveTextContent("Chocolates");
  expect(screen.queryByRole("heading", { name: "Calificación" })).toBeNull();
  expect(screen.getByRole("heading", { name: /Propuestas/ })).toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "Calificación" }));
  expect(screen.getByRole("heading", { name: "Calificación" })).toBeInTheDocument();
  await user.click(screen.getByText("Acciones del negocio"));
  expect(screen.getByRole("button", { name: "Ganar" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Perder" })).toBeInTheDocument();
});

test("un ganado muestra fecha de ganado, su cotizacion y productos bloqueados", async () => {
  const user = userEvent.setup();
  const won = {
    ...baseDeal,
    status: "WON",
    closedAt: "2026-10-05T00:00:00.000Z",
    quotes: [{ id: "q1", number: "COT-000001", status: "ACCEPTED", subtotal: "120.00", tax: "15.00", total: "135.00", createdAt: "2026-10-05T12:00:00.000Z" }],
  };
  serve(won);
  const { unmount } = render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  expect(within(screen.getByRole("tabpanel")).getAllByText("COT-000001").length).toBeGreaterThan(0);
  expect(within(screen.getByRole("tabpanel")).getAllByText("Aceptada").length).toBeGreaterThan(0);
  expect(screen.getAllByText(/135,00/).length).toBeGreaterThan(0);
  expect(screen.getByText("Ganado el")).toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: /Productos y propuestas/ }));
  expect(screen.getByText("Reversa el negocio para cambiar sus productos.")).toBeInTheDocument();
  await user.click(screen.getByText("Acciones del negocio"));
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
  const user = userEvent.setup();
  serve({ ...baseDeal, status: "REJECTED", closedAt: "2026-10-05T00:00:00.000Z", lossReason: "COMMERCIAL_RISK", lossDetail: null }, "VENDEDOR");
  render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  expect(screen.getAllByText("Rechazado").length).toBeGreaterThan(0);
  expect(screen.getByText("Rechazado el")).toBeInTheDocument();
  expect(screen.getByText("Riesgo comercial")).toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: /Productos y propuestas/ }));
  expect(screen.getByText("Reversa el negocio para cambiar sus productos.")).toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "Actividad" }));
  expect(screen.queryByRole("button", { name: "Registrar actividad" })).toBeNull();
  expect(screen.queryByRole("button", { name: /Reversar|Enmendar|Ganar|Perder/ })).toBeNull();
});

test("al ganar, la tabla de productos vuelve a leer lo del servidor y no conserva filas editadas", async () => {
  serve(baseDeal);
  const { rerender, container } = render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  const user = userEvent.setup();
  await user.click(screen.getByRole("tab", { name: /Productos y propuestas/ }));
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

test("cambiar de pestaña conserva las líneas editadas que todavía no se guardan", async () => {
  const user = userEvent.setup();
  serve(baseDeal);
  render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  await user.click(screen.getByRole("tab", { name: /Productos y propuestas/ }));
  await user.click(screen.getByRole("button", { name: "Editar líneas" }));
  const description = screen.getByLabelText("Descripción del producto 1");
  await user.type(description, " revisado");
  await user.click(screen.getByRole("button", { name: "Cerrar edición de productos" }));
  await user.click(screen.getByRole("tab", { name: "Resumen" }));
  await user.click(screen.getByRole("tab", { name: /Productos y propuestas/ }));
  await user.click(screen.getByRole("button", { name: "Editar líneas" }));
  expect(screen.getByLabelText("Descripción del producto 1")).toHaveValue("Chocolates revisado");
});

test("el resumen muestra actividad reciente y sus pendientes se completan en Actividad", async () => {
  const user = userEvent.setup();
  serve(baseDeal, "ADMIN", apiPage([pendingCall], "k1"));
  render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  expect(api).toHaveBeenCalledWith("/deals/d1/timeline");
  expect(screen.getAllByText("Llamar a Maria").length).toBeGreaterThan(0);
  await user.click(screen.getByRole("tab", { name: "Actividad" }));
  expect(screen.getByRole("button", { name: "Completar Llamar a Maria" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Abrir historial completo" })).toBeInTheDocument();
});

test("un VENDEDOR sin acceso al historial ve la ficha, el aviso y el formulario de actividad", async () => {
  const user = userEvent.setup();
  serve(baseDeal, "VENDEDOR", 404);
  render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  expect(screen.getByRole("heading", { name: "Cuenta Andina" })).toBeInTheDocument();
  await user.click(screen.getByRole("tab", { name: "Actividad" }));
  expect(screen.getAllByText("No tienes acceso al historial de este registro.").length).toBeGreaterThan(0);
  expect(screen.getByRole("button", { name: "Registrar actividad" })).toBeInTheDocument();
});

test("P1 y P6: la ficha avisa «En riesgo» y muestra los abonos; solo un ADMIN los borra", async () => {
  const user = userEvent.setup();
  const deal = {
    ...baseDeal,
    atRisk: true,
    idleDays: 12,
    payments: [{ id: "pay-1", amount: "100", paidAt: "2026-11-12T00:00:00.000Z", note: null, createdBy: { id: "u1", name: "Zaith" } }],
    balance: { due: "135.00", paid: "100.00", pending: "35.00" },
  };
  serve(deal, "VENDEDOR");
  const { unmount } = render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  expect(screen.getByText(/En riesgo · 12 días sin actividad/)).toBeInTheDocument();
  expect(screen.getByRole("heading", { name: /Saldo pendiente/ })).toBeInTheDocument();
  expect(screen.getAllByText(/35,00/).length).toBeGreaterThan(0);
  await user.click(screen.getByRole("tab", { name: /^Abonos/ }));
  expect(screen.getByRole("heading", { name: /Abonos/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Borrar el abono/ })).toBeNull();
  unmount();
  serve({ ...deal, atRisk: false }, "ADMIN");
  render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  expect(screen.queryByText(/En riesgo/)).toBeNull();
  await user.click(screen.getByRole("tab", { name: /^Abonos/ }));
  expect(screen.getByRole("button", { name: /Borrar el abono/ })).toBeInTheDocument();
});
