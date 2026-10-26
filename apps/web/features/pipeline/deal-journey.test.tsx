import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { DealJourney } from "./deal-journey";
import type { JourneyDeal } from "./types";

const deal = (extra: Partial<JourneyDeal>): JourneyDeal => ({
  id: "d1",
  title: "Cuenta Andina",
  value: "120.00",
  currency: "USD",
  status: "OPEN",
  expectedClose: null,
  stage: { id: "s2", name: "Negociación", color: null },
  ...extra,
});
const at = "2026-10-20T15:00:00.000Z";

test("un abierto muestra su último movimiento o su ingreso", () => {
  const { unmount } = render(
    <DealJourney deal={deal({ stageHistory: [{ changedAt: at, fromStage: { name: "Contactado" }, toStage: { name: "Negociación" } }] })} />,
  );
  expect(screen.getByRole("link", { name: "Cuenta Andina" })).toHaveAttribute("href", "/pipeline/d1");
  expect(screen.getByText("Negociación · Abierto")).toBeInTheDocument();
  expect(screen.getByText(/^Pasó de Contactado a Negociación el /)).toBeInTheDocument();
  unmount();
  render(<DealJourney deal={deal({ stageHistory: [{ changedAt: at, fromStage: null, toStage: { name: "Contactado" } }] })} />);
  expect(screen.getByText(/^Ingresó en Contactado el /)).toBeInTheDocument();
});

test("un cerrado muestra la fecha y el motivo en vez del movimiento", () => {
  render(
    <DealJourney
      deal={deal({
        status: "REJECTED",
        closedAt: at,
        lossReason: "COMMERCIAL_RISK",
        stageHistory: [{ changedAt: at, fromStage: null, toStage: { name: "Contactado" } }],
      })}
    />,
  );
  expect(screen.getByText("Negociación · Rechazado")).toBeInTheDocument();
  expect(screen.getByText(/^Cerrado el .* · Riesgo comercial$/)).toBeInTheDocument();
  expect(screen.queryByText(/Ingresó/)).toBeNull();
});
