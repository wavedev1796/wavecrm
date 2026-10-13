import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import ContactsPage from "./page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));
vi.mock("../../../../features/contactos/actions", () => ({ saveContact: vi.fn(), searchCompanies: vi.fn() }));
// Los componentes async no se resuelven dentro de <Suspense> en jsdom: se prueban aparte.
vi.mock("../../../../features/contactos/contacts-results", () => ({
  ContactsSummary: ({ query }: { query: string }) => `resumen ${query}`,
  ContactsResults: ({ query }: { query: string }) => <p>resultados {query}</p>,
}));

test("CRM-14: arma la consulta con los filtros y conserva Importar y Nuevo contacto", async () => {
  render(
    await ContactsPage({
      searchParams: Promise.resolve({
        search: "Ana",
        province: "Pichincha",
        tag: "Cliente",
        page: "2",
      }),
    }),
  );
  const query = "page=2&limit=10&search=Ana&province=Pichincha&tag=Cliente";
  expect(screen.getByText(`resultados ${query}`)).toBeInTheDocument();
  expect(screen.getByText(`resumen ${query}`)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /^Importar$/ })).toHaveAttribute(
    "href",
    "/contactos/importar",
  );
  expect(screen.getByRole("button", { name: "Nuevo contacto" })).toBeInTheDocument();
  expect(screen.getByLabelText("Buscar contacto")).toHaveValue("Ana");
});
