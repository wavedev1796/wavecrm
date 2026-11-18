import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import QuotesPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
// Los componentes async no se resuelven dentro de <Suspense> en jsdom: se prueban aparte.
vi.mock("../../../../features/quotes/quotes-results", () => ({
  QuotesSummary: ({ query }: { query: string }) => `resumen ${query}`,
  QuotesResults: ({ query }: { query: string }) => <p>resultados {query}</p>,
}));

test("listado de cotizaciones: arma la consulta con búsqueda, estado y página", async () => {
  render(await QuotesPage({ searchParams: Promise.resolve({ search: "COT-0001", status: "SENT", page: "2" }) }));
  const query = "page=2&limit=10&search=COT-0001&status=SENT";
  expect(screen.getByText(`resultados ${query}`)).toBeInTheDocument();
  expect(screen.getByText(`resumen ${query}`)).toBeInTheDocument();
  expect(screen.getByLabelText("Buscar cotización")).toHaveValue("COT-0001");
  expect(screen.getByLabelText("Filtrar por estado")).toHaveValue("SENT");
  expect(screen.getByRole("link", { name: /Limpiar/ })).toHaveAttribute("href", "/cotizaciones");
});

test("un estado desconocido se ignora en vez de romper la consulta", async () => {
  render(await QuotesPage({ searchParams: Promise.resolve({ status: "toString" }) }));
  expect(screen.getByText("resultados page=1&limit=10")).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Limpiar/ })).not.toBeInTheDocument();
});
