import { render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import { ContactsResults, ContactsSummary } from "./contacts-results";

vi.mock("@/lib/authenticated-api", () => ({ authenticatedApi: vi.fn() }));
const api = vi.mocked(authenticatedApi);

const QUERY = "page=2&limit=10&search=Ana";
const LISTA = {
  data: [
    {
      id: "c1",
      firstName: "Ana",
      lastName: "López",
      email: "ana@wave.ec",
      documentId: "1712345675",
      province: "Pichincha",
      tags: ["cliente"],
      company: { id: "e1", name: "Wave", legalName: null, taxId: "1791234561001" },
      owner: { id: "u1", name: "Eduardo", email: "e@wave.ec" },
      createdAt: "",
      updatedAt: "",
      phone: null,
      city: null,
      position: null,
    },
  ],
  meta: { page: 2, limit: 10, total: 12, totalPages: 2 },
};

// Un Response solo se lee una vez y en las pruebas `cache` no deduplica: cada llamada recibe uno nuevo.
const responde = (body: unknown, status = 200) =>
  api.mockImplementation(async () => Response.json(body, { status }));

test("CRM-14: la tabla enlaza cada contacto a su ficha y pagina", async () => {
  responde(LISTA);
  render(await ContactsResults({ query: QUERY, params: { search: "Ana" } }));

  expect(api).toHaveBeenCalledWith(`/contacts?${QUERY}`);
  expect(
    within(screen.getByRole("row", { name: /Ana López/ })).getByRole("link", {
      name: /Ana López/,
    }),
  ).toHaveAttribute("href", "/contactos/c1");
  expect(screen.getByText(/Mostrando 11–11 de 12/)).toBeInTheDocument();
});

test("CRM-14: el resumen cuenta los contactos o invita a organizar la cartera", async () => {
  responde(LISTA);
  render(<p>{await ContactsSummary({ query: QUERY })}</p>);
  expect(screen.getByText("12 contactos registrados")).toBeInTheDocument();

  responde(null, 500);
  render(<p>{await ContactsSummary({ query: QUERY })}</p>);
  expect(screen.getByText("Consulta y organiza tu cartera")).toBeInTheDocument();
});

test("CRM-14: listado vacío y error de carga", async () => {
  responde({ data: [], meta: { page: 1, limit: 10, total: 0, totalPages: 0 } });
  const view = render(await ContactsResults({ query: QUERY, params: {} }));
  expect(screen.getByText("No hay contactos que coincidan con los filtros.")).toBeInTheDocument();
  view.unmount();

  responde(null, 500);
  render(await ContactsResults({ query: QUERY, params: {} }));
  expect(
    screen.getByText("No pudimos cargar los contactos. Recarga la página."),
  ).toBeInTheDocument();
  expect(screen.queryByRole("table")).toBeNull();
});
