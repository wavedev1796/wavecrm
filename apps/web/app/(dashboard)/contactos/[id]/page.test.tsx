import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import ContactDetailPage from "./page";

vi.mock("@/lib/authenticated-api", () => ({ authenticatedApi: vi.fn() }));
vi.mock("next/navigation", () => ({ notFound: vi.fn() }));
vi.mock("../contact-form", () => ({
  ContactForm: ({ id }: { id: string }) => <div>Editando {id}</div>,
}));
const api = vi.mocked(authenticatedApi);

test("CRM-14: la ficha muestra datos, negocios, actividades y edición", async () => {
  api.mockResolvedValue(
    Response.json({
      id: "c1",
      firstName: "Ana",
      lastName: "López",
      email: "ana@wave.ec",
      phone: "+593991234567",
      documentId: "1712345675",
      province: "Pichincha",
      city: "Quito",
      position: "Gerente",
      tags: ["cliente"],
      createdAt: "",
      updatedAt: "",
      company: {
        id: "e1",
        name: "Wave",
        legalName: null,
        taxId: "1791234561001",
      },
      owner: { id: "u1", name: "Eduardo", email: "e@wave.ec" },
      deals: [
        {
          id: "d1",
          title: "Renovación anual",
          value: "4200",
          currency: "USD",
          status: "OPEN",
          expectedClose: null,
          stage: { id: "s1", name: "Negociación", color: null },
        },
      ],
      activities: [
        {
          id: "a1",
          type: "MEETING",
          status: "PENDING",
          subject: "Reunión comercial",
          description: null,
          dueAt: "2026-10-01T12:00:00.000Z",
          completedAt: null,
          assignee: { id: "u1", name: "Eduardo" },
        },
      ],
    }),
  );
  render(await ContactDetailPage({ params: Promise.resolve({ id: "c1" }) }));
  expect(api).toHaveBeenCalledWith("/contacts/c1");
  expect(
    screen.getByRole("heading", { name: "Ana López" }),
  ).toBeInTheDocument();
  expect(screen.getByText("Renovación anual")).toBeInTheDocument();
  expect(screen.getByText("Reunión comercial")).toBeInTheDocument();
  expect(screen.getByText("Editando c1")).toBeInTheDocument();
});
