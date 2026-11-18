import { render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import { QuotesResults, QuotesSummary, type QuoteRow } from "./quotes-results";

vi.mock("@/lib/authenticated-api", () => ({ authenticatedApi: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("../pipeline/actions", () => ({ acceptQuoteAction: vi.fn(), rejectQuoteAction: vi.fn() }));
const api = vi.mocked(authenticatedApi);

const row = (overrides: Partial<QuoteRow> = {}, deal: Partial<QuoteRow["deal"]> = {}): QuoteRow => ({
  id: "q1",
  number: "COT-000001",
  version: 2,
  status: "SENT",
  subtotal: "100.00",
  tax: "15.00",
  total: "115.00",
  createdAt: "2026-11-10T12:00:00.000Z",
  sentAt: "2026-11-10T00:00:00.000Z",
  validUntil: "2026-12-10T00:00:00.000Z",
  ...overrides,
  deal: { id: "d1", title: "Web corporativa", currency: "USD", status: "OPEN", company: { name: "Acme" }, contact: null, ...deal },
});
const responde = (body: unknown, status = 200) => api.mockImplementation(async () => Response.json(body, { status }));
const lista = (data: QuoteRow[]) => ({ data, meta: { page: 1, limit: 10, total: data.length, totalPages: 1 } });

test("cada fila enlaza al documento y al negocio; solo la enviada de un negocio abierto tiene acciones", async () => {
  responde(lista([
    row(),
    row({ id: "q2", number: "COT-000002", version: 1, status: "SUPERSEDED" }, { contact: { firstName: "Ana", lastName: "Vera" }, company: null }),
    row({ id: "q3", number: "COT-000003", status: "SENT" }, { status: "WON" }),
  ]));
  render(await QuotesResults({ query: "page=1&limit=10", params: {} }));

  expect(api).toHaveBeenCalledWith("/quotes?page=1&limit=10");
  const [, enviada, sustituida, cerrada] = screen.getAllByRole("row") as [HTMLElement, HTMLElement, HTMLElement, HTMLElement];
  expect(within(enviada).getByRole("link", { name: "Ver documento de COT-000001" })).toHaveAttribute("href", "/cotizaciones/q1");
  expect(within(enviada).getByRole("link", { name: "Web corporativa" })).toHaveAttribute("href", "/pipeline/d1");
  expect(within(enviada).getByText("COT-000001 · v2")).toBeInTheDocument();
  expect(within(enviada).getByText("Acme")).toBeInTheDocument();
  expect(within(enviada).getByText("Enviada")).toBeInTheDocument();
  expect(within(enviada).getByRole("button", { name: "Aceptar COT-000001" })).toBeInTheDocument();
  expect(within(enviada).getByRole("button", { name: "Rechazar COT-000001" })).toBeInTheDocument();
  expect(within(sustituida).getByText("Ana Vera")).toBeInTheDocument();
  expect(within(sustituida).getByText("Desactualizada")).toBeInTheDocument();
  expect(within(sustituida).queryByRole("button")).not.toBeInTheDocument();
  expect(within(cerrada).queryByRole("button")).not.toBeInTheDocument();
});

test("sin resultados, error del API y resumen", async () => {
  responde(lista([]));
  const vacia = render(await QuotesResults({ query: "q", params: {} }));
  expect(screen.getByText("No hay cotizaciones con estos filtros.")).toBeInTheDocument();
  vacia.unmount();
  responde(lista([row()]));
  expect(await QuotesSummary({ query: "q" })).toBe("1 cotización");
  responde({}, 500);
  render(await QuotesResults({ query: "q", params: {} }));
  expect(screen.getByRole("alert")).toHaveTextContent("No se pudieron cargar las cotizaciones");
  expect(await QuotesSummary({ query: "q" })).toBe("Sin datos");
});
