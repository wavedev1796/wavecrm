import { render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { PipelineBoard } from "./pipeline-board";
import { moveDealAction } from "./actions";
import type { Deal, Stage } from "./types";
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("./actions", () => ({
  moveDealAction: vi.fn(),
  saveDeal: vi.fn(),
  configurePipelineAction: vi.fn(),
  dealHistoryAction: vi.fn().mockResolvedValue({ data: [] }),
  deleteDealAction: vi.fn(),
}));
const deal: Deal = {
  id: "d1",
  title: "Cuenta Andina",
  value: "1250.25",
  currency: "USD",
  status: "OPEN",
  pipelineId: "p1",
  stageId: "s1",
  contactId: "c1",
  companyId: null,
  ownerId: "u1",
  expectedClose: "2026-10-22T00:00:00Z",
  contact: { id: "c1", firstName: "Ana", lastName: "Paz" },
  company: null,
  owner: { id: "u1", name: "Eduardo" },
};
const stages: Stage[] = [
  {
    id: "s1",
    name: "Inicial",
    color: "#2f6f8f",
    position: 0,
    probability: 10,
    count: 1,
    value: "1250.25",
    deals: [deal],
  },
  {
    id: "s2",
    name: "Ganado",
    color: null,
    position: 1,
    probability: 100,
    count: 0,
    value: "0",
    deals: [],
  },
];
function view() {
  render(
    <PipelineBoard
      pipeline={{ id: "p1", name: "Ventas", isDefault: true }}
      stages={stages}
      pipelines={[{ id: "p1", name: "Ventas", isDefault: true, stages }]}
      contacts={[{ id: "c1", name: "Ana Paz" }]}
      companies={[]}
      users={[{ id: "u1", name: "Eduardo" }]}
    />,
  );
}
test("crear desde una columna abre el modal con esa etapa y controles Wave", async () => {
  const user = userEvent.setup();
  view();
  await user.click(
    within(screen.getByRole("region", { name: "Etapa Ganado" })).getByRole(
      "button",
      { name: "Crear negocio" },
    ),
  );
  const modal = screen.getByRole("dialog", { name: "Crear nuevo negocio" });
  expect(within(modal).getByLabelText("Etapa", { exact: true })).toHaveValue(
    "s2",
  );
  for (const label of [
    "Pipeline",
    "Etapa",
    "Contacto",
    "Empresa",
    "Responsable",
    "Estado",
  ])
    expect(within(modal).getByLabelText(label, { exact: true })).toHaveClass(
      "select-control",
    );
  expect(within(modal).getByLabelText("Monto (USD)")).toHaveClass("input");
});
test("un movimiento fallido muestra el error y conserva la etapa visible", async () => {
  vi.mocked(moveDealAction).mockResolvedValue({ error: "No se pudo guardar." });
  const user = userEvent.setup();
  view();
  await user.selectOptions(
    screen.getByLabelText("Mover Cuenta Andina de etapa"),
    "s2",
  );
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent("No se pudo guardar."),
  );
  expect(screen.getByLabelText("Mover Cuenta Andina de etapa")).toHaveValue(
    "s1",
  );
});
test("el selector accesible solicita el mismo movimiento que el arrastre", async () => {
  vi.mocked(moveDealAction).mockResolvedValue({ data: {} });
  const user = userEvent.setup();
  view();
  await user.selectOptions(
    screen.getByLabelText("Mover Cuenta Andina de etapa"),
    "s2",
  );
  expect(moveDealAction).toHaveBeenCalledWith("d1", "s2");
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "Cuenta Andina se movio a Ganado.",
    ),
  );
});
