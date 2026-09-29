import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import CompanyDetailPage from "./page";

vi.mock("@/lib/authenticated-api", () => ({ authenticatedApi: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("../company-form", () => ({
  CompanyForm: ({ id }: { id: string }) => <div>Editando {id}</div>,
}));
const api = vi.mocked(authenticatedApi);

test("la ficha muestra contactos negocios historial y edicion", async () => {
  api.mockResolvedValue(
    Response.json({
      id: "e1",
      name: "Comercial Andina",
      legalName: "Comercial Andina S.A.",
      taxId: "1791234561001",
      website: "https://andina.ec",
      phone: "+59322345678",
      email: "ventas@andina.ec",
      province: "Pichincha",
      city: "Quito",
      address: "Av. Republica 123",
      tags: ["cliente"],
      owner: { id: "u1", name: "Eduardo", email: "e@wave.ec" },
      _count: { contacts: 1 },
      createdAt: "2026-09-20T12:00:00.000Z",
      updatedAt: "2026-09-29T12:00:00.000Z",
      contacts: [
        {
          id: "c1",
          firstName: "Maria",
          lastName: "Cordero",
          email: "maria@andina.ec",
          phone: "+593991234567",
          position: "Gerente",
          tags: [],
        },
      ],
      deals: [
        {
          id: "d1",
          title: "Renovacion anual",
          value: "4200",
          currency: "USD",
          status: "OPEN",
          expectedClose: null,
          stage: { id: "s1", name: "Negociacion", color: null },
        },
      ],
      history: [
        {
          id: "h1",
          action: "UPDATE",
          changes: { fields: ["email", "city"] },
          createdAt: "2026-09-29T12:00:00.000Z",
          user: { id: "u1", name: "Eduardo" },
        },
      ],
    }),
  );

  render(await CompanyDetailPage({ params: Promise.resolve({ id: "e1" }) }));

  expect(api).toHaveBeenCalledWith("/companies/e1");
  expect(
    screen.getByRole("heading", { name: "Comercial Andina" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Maria Cordero" })).toHaveAttribute(
    "href",
    "/contactos/c1",
  );
  expect(screen.getByText("Renovacion anual")).toBeInTheDocument();
  expect(screen.getByText("Actualizó correo, cantón")).toBeInTheDocument();
  expect(screen.getByText("Editando e1")).toBeInTheDocument();
});
