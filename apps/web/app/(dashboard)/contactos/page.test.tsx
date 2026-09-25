import { render, screen, within } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import ContactsPage from "./page";

vi.mock("@/lib/authenticated-api", () => ({ authenticatedApi: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const api = vi.mocked(authenticatedApi);

test("CRM-14: lista contactos reales, conserva Importar CSV y envía filtros", async () => {
  api.mockResolvedValue(
    Response.json({
      data: [
        {
          id: "c1",
          firstName: "Ana",
          lastName: "López",
          email: "ana@wave.ec",
          documentId: "1712345675",
          province: "Pichincha",
          tags: ["cliente"],
          company: {
            id: "e1",
            name: "Wave",
            legalName: null,
            taxId: "1791234561001",
          },
          owner: { id: "u1", name: "Eduardo", email: "e@wave.ec" },
          createdAt: "",
          updatedAt: "",
          phone: null,
          city: null,
          position: null,
        },
      ],
      meta: { page: 2, limit: 10, total: 12, totalPages: 2 },
    }),
  );
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
  expect(api).toHaveBeenCalledWith(
    "/contacts?page=2&limit=10&search=Ana&province=Pichincha&tag=Cliente",
  );
  expect(
    within(screen.getByRole("row", { name: /Ana López/ })).getByRole("link", {
      name: /Ana López/,
    }),
  ).toHaveAttribute("href", "/contactos/c1");
  expect(screen.getByRole("link", { name: "Importar CSV" })).toHaveAttribute(
    "href",
    "/contactos/importar",
  );
  expect(
    screen.getByRole("button", { name: "Nuevo contacto" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Mostrando 11–11 de 12/)).toBeInTheDocument();
});
