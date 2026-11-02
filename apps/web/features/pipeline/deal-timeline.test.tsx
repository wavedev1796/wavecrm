import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { entry } from "../timeline/timeline-fixture";
import { baseDeal } from "./deal-fixture";
import { DealTimeline } from "./deal-timeline";

vi.mock("./actions", () => ({ createActivityAction: vi.fn(), completeActivityAction: vi.fn() }));
vi.mock("../timeline/actions", () => ({ loadTimeline: vi.fn() }));

test("muestra el formulario de actividad y el historial con sus pendientes", () => {
  render(
    <DealTimeline
      deal={baseDeal}
      timeline={{ entries: [entry("ACTIVITY:a1", { title: "Llamar a Maria", pending: { id: "a1", subject: "Llamar a Maria" } })], nextCursor: null }}
    />,
  );
  expect(screen.getByRole("heading", { name: "Actividad del negocio" })).toBeInTheDocument();
  expect(screen.getByLabelText("Asunto")).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "Ya se realizó" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Completar Llamar a Maria" })).toBeInTheDocument();
});

test("sin acceso al historial el formulario sigue; un rechazado no admite actividades", () => {
  const forbidden = { error: "No tienes acceso al historial de este registro.", forbidden: true as const };
  const { rerender } = render(<DealTimeline deal={baseDeal} timeline={forbidden} />);
  expect(screen.getByText("No tienes acceso al historial de este registro.")).toBeInTheDocument();
  expect(screen.getByLabelText("Asunto")).toBeInTheDocument();
  rerender(<DealTimeline deal={{ ...baseDeal, status: "REJECTED" }} timeline={{ entries: [], nextCursor: null }} />);
  expect(screen.queryByLabelText("Asunto")).toBeNull();
  expect(screen.getByText("Todavía no hay actividad registrada.")).toBeInTheDocument();
});
