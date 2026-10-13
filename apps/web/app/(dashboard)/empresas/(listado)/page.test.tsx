import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import CompaniesPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("../../../../features/empresas/actions", () => ({ saveCompany: vi.fn() }));
// Los componentes async no se resuelven dentro de <Suspense> en jsdom: se prueban aparte.
vi.mock("../../../../features/empresas/companies-results", () => ({
  CompaniesSummary: ({ query }: { query: string }) => `resumen ${query}`,
  CompaniesResults: ({ query }: { query: string }) => <p>resultados {query}</p>,
}));

test("CRM-15: arma la consulta, avisa la empresa creada y conserva las acciones", async () => {
  render(
    await CompaniesPage({
      searchParams: Promise.resolve({ search: "andina", creada: "1" }),
    }),
  );
  expect(screen.getByText("resultados page=1&limit=10&search=andina")).toBeInTheDocument();
  expect(screen.getByText("resumen page=1&limit=10&search=andina")).toBeInTheDocument();
  expect(screen.getByText("Empresa creada.")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /^Importar$/ })).toHaveAttribute(
    "href",
    "/empresas/importar",
  );
  expect(screen.getByRole("button", { name: "Añadir empresa" })).toBeInTheDocument();
  expect(screen.getByLabelText("Buscar empresa")).toHaveValue("andina");
});

test("CRM-15: sin ?creada no hay aviso", async () => {
  render(await CompaniesPage({ searchParams: Promise.resolve({}) }));
  expect(screen.queryByText("Empresa creada.")).toBeNull();
});
