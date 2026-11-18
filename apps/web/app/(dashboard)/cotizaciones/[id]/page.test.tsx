import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import QuotePage from "./page";

vi.mock("@/lib/authenticated-api", () => ({ authenticatedApi: vi.fn() }));
vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));
const api = vi.mocked(authenticatedApi);
const quote = {
  id: "q1",
  number: "COT-000007",
  version: 2,
  status: "SUPERSEDED",
  subtotal: "180.00",
  tax: "27.00",
  total: "207.00",
  createdAt: "2026-11-10T15:00:00.000Z",
  sentAt: "2026-11-10T00:00:00.000Z",
  validUntil: "2026-11-30T00:00:00.000Z",
  deal: { id: "d1", title: "Título vivo del negocio" },
  items: [
    { description: "Licencia anual", quantity: "2", unitPrice: "100.00", taxRate: 15, discountRate: 10, product: { code: "LIC-01" } },
  ],
  snapshot: {
    customer: {
      company: { name: "Andina", legalName: "Andina S.A.", taxId: "1790012345001", email: "compras@andina.ec", phone: null, address: "Av. Amazonas", city: "Quito" },
      contact: { firstName: "Ana", lastName: "López", email: "ana@andina.ec", phone: "0991234567", documentId: "1710034065", position: "Compras" },
    },
    issuer: { name: "Zoe Vendedora", email: "zoe@wave.ec" },
    deal: { title: "Renovación Andina", currency: "USD" },
  },
};
const page = (id = "q1") => QuotePage({ params: Promise.resolve({ id }) });

test("arma el documento solo con la copia guardada de la versión", async () => {
  api.mockResolvedValue(Response.json(quote));
  render(await page());
  expect(api).toHaveBeenCalledWith("/quotes/q1");
  const doc = screen.getByRole("article", { name: "COT-000007 · versión 2" });
  expect(within(doc).getByRole("img", { name: "Wave" })).toBeInTheDocument();
  expect(within(doc).getByText("Desactualizada")).toBeInTheDocument();
  expect(within(doc).getByText("Andina S.A.")).toBeInTheDocument();
  expect(within(doc).getByText("RUC: 1790012345001")).toBeInTheDocument();
  expect(within(doc).getByText(/Preparada por Zoe Vendedora/)).toBeInTheDocument();
  // El título del snapshot, no el actual del negocio.
  expect(within(doc).getByText("Renovación Andina")).toBeInTheDocument();
  expect(within(doc).queryByText("Título vivo del negocio")).toBeNull();
  const row = within(doc).getByRole("row", { name: /Licencia anual/ });
  expect(row).toHaveTextContent("Código: LIC-01");
  expect(row).toHaveTextContent("10 %");
  expect(row).toHaveTextContent(/180,00/);
  expect(within(doc).getByText(/207,00/)).toBeInTheDocument();
  expect(within(doc).getByText(/no un comprobante electrónico autorizado por el SRI/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Volver al negocio" })).toHaveAttribute("href", "/pipeline/d1");
});

test("Descargar PDF abre la impresión sin pedir nada al API", async () => {
  api.mockClear();
  api.mockResolvedValue(Response.json(quote));
  const print = vi.spyOn(window, "print").mockImplementation(() => undefined);
  render(await page());
  await userEvent.click(screen.getByRole("button", { name: "Descargar PDF" }));
  expect(print).toHaveBeenCalledOnce();
  expect(api).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/Descargar no registra un envío/)).toBeInTheDocument();
});

test("una versión sin copia completa no se imprime con datos inventados", async () => {
  api.mockResolvedValue(Response.json({ ...quote, snapshot: {} }));
  render(await page());
  expect(screen.queryByRole("article")).toBeNull();
  expect(screen.queryByRole("button", { name: "Descargar PDF" })).toBeNull();
  expect(screen.getByText(/No se genera su PDF/)).toBeInTheDocument();
});

test("404 del API (inexistente o ajena) es notFound y un fallo ofrece reintentar", async () => {
  api.mockResolvedValue(new Response(null, { status: 404 }));
  await expect(page()).rejects.toThrow("NOT_FOUND");
  api.mockResolvedValue(new Response(null, { status: 500 }));
  render(await page("q 1"));
  expect(screen.getByRole("alert")).toHaveTextContent("No se pudo cargar la cotización. Tu propuesta no cambió.");
  expect(screen.getByRole("link", { name: "Reintentar" })).toHaveAttribute("href", "/cotizaciones/q%201");
});
