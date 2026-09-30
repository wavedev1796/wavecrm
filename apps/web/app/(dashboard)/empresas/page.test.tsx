import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import CompaniesPage from "./page";

vi.mock("@/lib/authenticated-api", () => ({ authenticatedApi: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("./actions", () => ({ saveCompany: vi.fn() }));
const api = vi.mocked(authenticatedApi);

test("CRM-15: lista empresas con sus filtros, contactos y acciones", async () => {
  api.mockResolvedValue(
    Response.json({
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
    }),
  );
  render(
    await CompaniesPage({
      searchParams: Promise.resolve({ search: "andina", creada: "1" }),
    }),
  );
  expect(api).toHaveBeenCalledWith("/companies?page=1&limit=10&search=andina");
  expect(screen.getByText("Empresa creada.")).toBeInTheDocument();
  expect(screen.getByText("1 empresa registrada")).toBeInTheDocument();
  const row = screen.getByRole("row", { name: /Comercial Andina/ });
  expect(row).toHaveTextContent("1791234561001");
  expect(row).toHaveTextContent("Comercial Andina S.A.");
  expect(row).toHaveTextContent("mayorista");
  expect(row).toHaveTextContent("Vendedor Demo");
  expect(screen.getByRole("link", { name: /Comercial Andina/ })).toHaveAttribute(
    "href",
    "/empresas/e1",
  );
  expect(screen.getByRole("link", { name: "Importar CSV" })).toHaveAttribute(
    "href",
    "/empresas/importar",
  );
  expect(
    screen.getByRole("button", { name: "Añadir empresa" }),
  ).toBeInTheDocument();
  expect(screen.getByLabelText("Buscar empresa")).toHaveValue("andina");
});

test("CRM-15: listado vacío y error de carga", async () => {
  api.mockResolvedValueOnce(
    Response.json({
      data: [],
      meta: { page: 1, limit: 10, total: 0, totalPages: 0 },
    }),
  );
  const view = render(
    await CompaniesPage({ searchParams: Promise.resolve({}) }),
  );
  expect(
    screen.getByText("No hay empresas que coincidan con los filtros."),
  ).toBeInTheDocument();
  expect(screen.getByText("0 empresas registradas")).toBeInTheDocument();
  view.unmount();

  api.mockResolvedValueOnce(new Response(null, { status: 500 }));
  render(await CompaniesPage({ searchParams: Promise.resolve({}) }));
  expect(
    screen.getByText("No pudimos cargar las empresas. Recarga la página."),
  ).toBeInTheDocument();
});
