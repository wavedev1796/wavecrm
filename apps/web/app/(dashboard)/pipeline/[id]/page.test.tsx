import { render, screen } from "@testing-library/react";
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
  winDealAction: vi.fn(),
  loseDealAction: vi.fn(),
  reopenDealAction: vi.fn(),
  createActivityAction: vi.fn(),
  completeActivityAction: vi.fn(),
}));
const api = vi.mocked(authenticatedApi);

test("la ficha abierta muestra valor, productos, empresa enlazada y botones de cierre", async () => {
  api.mockResolvedValue(Response.json(baseDeal));
  render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  expect(api).toHaveBeenCalledWith("/deals/d1");
  expect(screen.getByRole("heading", { name: "Cuenta Andina" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Comercial Andina" })).toHaveAttribute("href", "/empresas/e1");
  expect(screen.getByLabelText("Descripción del producto 1")).toHaveValue("Chocolates");
  expect(screen.getByRole("button", { name: "Ganar" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Perder" })).toBeInTheDocument();
});

test("un ganado muestra fecha de ganado, su cotizacion y productos bloqueados", async () => {
  api.mockResolvedValue(
    Response.json({
      ...baseDeal,
      status: "WON",
      closedAt: "2026-10-05T00:00:00.000Z",
      quotes: [{ id: "q1", number: "COT-000001", status: "DRAFT", subtotal: "120.00", tax: "15.00", total: "135.00", createdAt: "2026-10-05T12:00:00.000Z" }],
    }),
  );
  render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  expect(screen.getByText(/COT-000001 · Borrador · .*135,00/)).toBeInTheDocument();
  expect(screen.getByText("Ganado el")).toBeInTheDocument();
  expect(screen.getByText("Reabre el negocio para cambiar sus productos.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Reabrir" })).toBeInTheDocument();
});

test("un perdido muestra su motivo y detalle", async () => {
  api.mockResolvedValue(
    Response.json({ ...baseDeal, status: "LOST", closedAt: "2026-10-05T00:00:00.000Z", lossReason: "OTHER", lossDetail: "Cerro el local" }),
  );
  render(await DealPage({ params: Promise.resolve({ id: "d1" }) }));
  expect(screen.getByText("Otro")).toBeInTheDocument();
  expect(screen.getByText("Cerro el local")).toBeInTheDocument();
});
