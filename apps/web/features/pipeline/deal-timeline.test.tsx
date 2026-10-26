import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { completeActivityAction } from "./actions";
import { baseDeal } from "./deal-fixture";
import { DealTimeline } from "./deal-timeline";

vi.mock("./actions", () => ({
  createActivityAction: vi.fn(),
  completeActivityAction: vi.fn(),
}));

const deal = {
  ...baseDeal,
  activities: [
    {
      id: "a1",
      type: "CALL" as const,
      status: "PENDING" as const,
      subject: "Llamar a Maria",
      description: null,
      dueAt: "2026-10-12T00:00:00.000Z",
      completedAt: null,
      createdAt: "2026-10-03T12:00:00.000Z",
      assignee: { id: "u1", name: "Zaith" },
    },
  ],
  stageHistory: [
    {
      id: "h1",
      changedAt: "2026-10-01T15:00:00.000Z",
      fromStage: null,
      toStage: { id: "s1", name: "Propuesta" },
      changedBy: { id: "u1", name: "Zaith" },
    },
  ],
  closures: [
    {
      id: "c1",
      action: "LOST" as const,
      changes: { lossReason: "NEGOTIATION" as const, lossDetail: null },
      createdAt: "2026-10-05T12:00:00.000Z",
      user: { id: "u1", name: "Zaith" },
    },
  ],
};

test("mezcla actividades, etapas y cierres del mas reciente al mas antiguo", async () => {
  vi.mocked(completeActivityAction).mockResolvedValue({ data: {} });
  const user = userEvent.setup();
  render(<DealTimeline deal={deal} />);
  const items = screen.getAllByRole("listitem").map((li) => li.textContent);
  expect(items[0]).toMatch(/Llamada · Llamar a Maria/);
  expect(items[1]).toMatch(/Perdido · Problemas de negociación/);
  expect(items[2]).toMatch(/Creado en Propuesta/);
  await user.click(screen.getByRole("button", { name: "Completar Llamar a Maria" }));
  expect(completeActivityAction).toHaveBeenCalledWith("d1", "a1");
  expect(screen.getByLabelText("Asunto")).toBeInTheDocument();
});

test("las propuestas, el seguimiento y el rechazo dejan su evento con quién y cuándo", () => {
  const event = (id: string, action: string, changes: object, day: string) => ({
    id,
    action: action as never,
    changes,
    createdAt: `2026-10-${day}T12:00:00.000Z`,
    user: { id: "u1", name: "Zaith" },
  });
  render(
    <DealTimeline
      deal={{
        ...deal,
        status: "REJECTED",
        activities: [],
        stageHistory: [],
        closures: [
          event("e1", "QUOTE_SENT", { quoteNumber: "COT-000001", total: "135.00", validUntil: "2026-11-30T00:00:00.000Z" }, "10"),
          event("e2", "QUOTE_SUPERSEDED", { quoteNumber: "COT-000001" }, "11"),
          event("e3", "QUOTE_ACCEPTED", { quoteNumber: "COT-000002", acceptanceNote: "Orden 55" }, "12"),
          event("e4", "LOST", { lossReason: "NEED_POSTPONED", followUpAt: "2027-01-18T00:00:00.000Z" }, "13"),
          event("e5", "REJECTED", { lossReason: "DO_NOT_CONTACT", quotes: ["COT-000002"], cancelledActivities: 2 }, "14"),
          event("e6", "QUOTE_FUTURO", {}, "15"),
        ],
      }}
    />,
  );
  const items = screen.getAllByRole("listitem").map((li) => li.textContent);
  expect(items).toHaveLength(5);
  expect(items[0]).toMatch(/Rechazado · Cliente solicita no ser contactado.*Zaith.*1 propuesta rechazada · 2 actividades canceladas/);
  expect(items[1]).toMatch(/Perdido · Necesidad aplazada.*Seguimiento programado para/);
  expect(items[2]).toMatch(/Propuesta COT-000002 aceptada.*Orden 55/);
  expect(items[3]).toMatch(/Propuesta COT-000001 desactualizada por cambios en los productos/);
  expect(items[4]).toMatch(/Propuesta COT-000001 enviada · .*135,00.*Vigente hasta/);
  expect(screen.queryByLabelText("Asunto")).toBeNull();
});

test("los retrocesos y reaperturas muestran su motivo; la actividad puede registrarse como realizada", () => {
  render(
    <DealTimeline
      deal={{
        ...deal,
        activities: [],
        stageHistory: [
          {
            id: "h2",
            changedAt: "2026-10-06T15:00:00.000Z",
            fromStage: { id: "s2", name: "Negociación" },
            toStage: { id: "s1", name: "Contactado" },
            changedBy: { id: "u1", name: "Zaith" },
            reason: "El cliente pausó la compra",
          },
        ],
        closures: [
          {
            id: "c2",
            action: "REOPENED" as const,
            changes: { from: "WON" as const, reason: "Anuló la orden" },
            createdAt: "2026-10-07T12:00:00.000Z",
            user: { id: "u2", name: "Eduardo" },
          },
        ],
      }}
    />,
  );
  expect(screen.getByText("Motivo: El cliente pausó la compra")).toBeInTheDocument();
  expect(screen.getByText("Motivo: Anuló la orden")).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "Ya se realizó" })).toBeInTheDocument();
});
