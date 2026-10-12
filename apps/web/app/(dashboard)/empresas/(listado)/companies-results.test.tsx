import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import { CompaniesResults, CompaniesSummary } from "./companies-results";

vi.mock("@/lib/authenticated-api", () => ({ authenticatedApi: vi.fn() }));
const api = vi.mocked(authenticatedApi);

const QUERY = "page=1&limit=10&search=andina";
const LISTA = {
  data: [
    {
      id: "e1",
      name: "Comercial Andina",
      legalName: "Comercial Andina S.A.",
      taxId: "1791234561001",
      province: "Pichincha",
      tags: ["mayorista"],
      owner: { id: "u1", name: "Vendedor Demo" },
      _count: { contacts: 3 },
    },
  ],
  meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
};

// Un Response solo se lee una vez y en las pruebas `cache` no deduplica: cada llamada recibe uno nuevo.
const responde = (body: unknown, status = 200) =>
  api.mockImplementation(async () => Response.json(body, { status }));

test("CRM-15: lista empresas con RUC, etiquetas, contactos y responsable", async () => {
  responde(LISTA);
  render(await CompaniesResults({ query: QUERY, params: { search: "andina" } }));

  expect(api).toHaveBeenCalledWith(`/companies?${QUERY}`);
  const row = screen.getByRole("row", { name: /Comercial Andina/ });
  expect(row).toHaveTextContent("1791234561001");
  expect(row).toHaveTextContent("Comercial Andina S.A.");
  expect(row).toHaveTextContent("mayorista");
  expect(row).toHaveTextContent("3");
  expect(row).toHaveTextContent("Vendedor Demo");
  expect(screen.getByRole("link", { name: /Comercial Andina/ })).toHaveAttribute(
    "href",
    "/empresas/e1",
  );
});

test("CRM-15: el resumen cuenta las empresas o invita a organizar las cuentas", async () => {
  responde(LISTA);
  render(<p>{await CompaniesSummary({ query: QUERY })}</p>);
  expect(screen.getByText("1 empresa registrada")).toBeInTheDocument();

  responde(null, 500);
  render(<p>{await CompaniesSummary({ query: QUERY })}</p>);
  expect(screen.getByText("Consulta y organiza tus cuentas")).toBeInTheDocument();
});

test("CRM-15: listado vacío y error de carga", async () => {
  responde({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } });
  const view = render(await CompaniesResults({ query: QUERY, params: {} }));
  expect(screen.getByText("No hay empresas que coincidan con los filtros.")).toBeInTheDocument();
  view.unmount();

  responde(null, 500);
  render(await CompaniesResults({ query: QUERY, params: {} }));
  expect(
    screen.getByText("No pudimos cargar las empresas. Recarga la página."),
  ).toBeInTheDocument();
  expect(screen.queryByRole("table")).toBeNull();
});
