import { render, screen, within } from "@testing-library/react";
import { expect, test } from "vitest";
import { ClientProducts } from "./client-products";
import type { JourneyDeal } from "./types";

const deal = (id: string, status: JourneyDeal["status"], closedAt: string | null, items: JourneyDeal["items"]): JourneyDeal => ({
  id,
  title: "Negocio " + id,
  value: "100",
  currency: "USD",
  status,
  expectedClose: null,
  closedAt,
  stage: { id: "s1", name: "Ganado", color: null },
  items,
});

test("P13: agrupa los productos de los ganados (sin distinguir mayúsculas) con cantidad, negocios y último cierre", () => {
  render(
    <ClientProducts
      deals={[
        deal("d1", "WON", "2026-10-02T00:00:00.000Z", [
          { description: "Licencia anual", quantity: "2" },
          { description: "Soporte", quantity: "1.5" },
        ]),
        deal("d2", "WON", "2026-11-05T00:00:00.000Z", [
          { description: "licencia anual ", quantity: "3" },
          { description: "Licencia anual", quantity: "1" },
        ]),
        // Abiertos, perdidos y rechazados no cuentan.
        deal("d3", "OPEN", null, [{ description: "Licencia anual", quantity: "50" }]),
        deal("d4", "LOST", "2026-11-06T00:00:00.000Z", [{ description: "Hosting", quantity: "1" }]),
      ]}
    />,
  );
  expect(screen.getByRole("heading", { name: /Productos comprados/ })).toHaveTextContent("2");
  const [licencia, soporte] = screen.getAllByRole("article");
  expect(within(licencia!).getByText("Licencia anual")).toBeInTheDocument();
  expect(licencia).toHaveTextContent(/2 negocios ganados · último el 5 nov.* 2026/);
  expect(licencia).toHaveTextContent("× 6");
  expect(soporte).toHaveTextContent(/1 negocio ganado · último el 2 oct.* 2026/);
  expect(soporte).toHaveTextContent("× 1,5");
  expect(screen.queryByText("Hosting")).toBeNull();
});

test("P13: sin negocios ganados con productos muestra el aviso vacío", () => {
  render(<ClientProducts deals={[deal("d1", "WON", "2026-10-02T00:00:00.000Z", []), deal("d2", "OPEN", null, undefined)]} />);
  expect(screen.getByText("Aún no hay negocios ganados con productos.")).toBeInTheDocument();
});
