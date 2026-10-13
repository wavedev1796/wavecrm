import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { PipelineBoard } from "./pipeline-board";
import { dealHistoryAction, deleteDealAction, moveDealAction } from "./actions";
import type { Deal, Stage } from "./types";
const router = vi.hoisted(() => ({ push: vi.fn(), refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
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
function view(boardStages = stages) {
  render(
    <PipelineBoard
      pipeline={{ id: "p1", name: "Ventas", isDefault: true }}
      stages={boardStages}
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
  ])
    expect(within(modal).getByLabelText(label, { exact: true })).toHaveClass(
      "select-control",
    );
  expect(within(modal).getByLabelText("Monto (USD)")).toHaveClass("input");
  expect(within(modal).queryByLabelText("Estado", { exact: true })).toBeNull();
});
test("el titulo de la tarjeta abre la ficha del negocio", () => {
  view();
  expect(screen.getByRole("link", { name: "Cuenta Andina" })).toHaveAttribute(
    "href",
    "/pipeline/d1",
  );
});
test("con productos el monto se ve pero no se edita ni se envia", async () => {
  const user = userEvent.setup();
  stages[0]!.deals[0] = { ...deal, _count: { items: 2 } };
  view();
  await user.click(screen.getByRole("button", { name: "Editar" }));
  const modal = screen.getByRole("dialog", { name: "Editar negocio" });
  expect(within(modal).getByLabelText("Monto (USD)")).toHaveAttribute("readonly");
  expect(within(modal).getByText("Se calcula con los productos de la ficha.")).toBeInTheDocument();
  stages[0]!.deals[0] = deal;
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

test("arrastrar una tarjeta a otra columna la mueve; soltarla en su columna no hace nada", async () => {
  vi.mocked(moveDealAction).mockResolvedValue({ data: {} });
  view();
  const card = screen.getByRole("article", { name: "Negocio Cuenta Andina" });
  const target = screen.getByRole("region", { name: "Etapa Ganado" });
  const dataTransfer = { setData: vi.fn(), dropEffect: "", effectAllowed: "" };

  fireEvent.dragStart(card, { dataTransfer });
  expect(card).toHaveClass("deal-card--dragging");
  fireEvent.dragOver(target, { dataTransfer });
  expect(target).toHaveClass("pipeline-column--over");
  fireEvent.dragLeave(target, { relatedTarget: document.body });
  expect(target).not.toHaveClass("pipeline-column--over");
  fireEvent.dragOver(target, { dataTransfer });
  fireEvent.drop(target, { dataTransfer });

  await waitFor(() => expect(router.refresh).toHaveBeenCalled());
  expect(moveDealAction).toHaveBeenCalledWith("d1", "s2");
  expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "d1");

  fireEvent.dragStart(card, { dataTransfer });
  fireEvent.dragEnd(card);
  expect(card).not.toHaveClass("deal-card--dragging");
  fireEvent.drop(screen.getByRole("region", { name: "Etapa Inicial" }), { dataTransfer });
  expect(moveDealAction).toHaveBeenCalledTimes(1);
});

test("cambiar de pipeline navega con su id", async () => {
  const user = userEvent.setup();
  render(
    <PipelineBoard
      pipeline={{ id: "p1", name: "Ventas", isDefault: true }}
      stages={stages}
      pipelines={[
        { id: "p1", name: "Ventas", isDefault: true, stages },
        { id: "p 2", name: "Alianzas", isDefault: false, stages: [] },
      ]}
      contacts={[]}
      companies={[]}
      users={[]}
    />,
  );
  expect(screen.getByRole("option", { name: "Ventas · Principal" })).toBeInTheDocument();
  await user.selectOptions(screen.getByLabelText("Pipeline de ventas"), "p 2");
  expect(router.push).toHaveBeenCalledWith("/pipeline?pipelineId=p%202");
});

test("sin etapas avisa que hay que configurarlas y no deja crear negocios", () => {
  view([]);
  expect(screen.getByText(/Agrega una etapa en Configurar pipeline/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Nuevo negocio" })).toBeDisabled();
  expect(screen.getByText("0 negocios en este pipeline")).toBeInTheDocument();
});

test("una tarjeta ganada sin contacto, responsable ni fecha muestra sus textos de respaldo", () => {
  const won: Deal = {
    ...deal,
    status: "WON",
    contact: null,
    owner: null,
    expectedClose: null,
    company: { id: "co1", name: "Andina S.A." },
  };
  view([{ ...stages[0]!, deals: [won] }, stages[1]!]);
  const card = screen.getByRole("article", { name: "Negocio Cuenta Andina" });
  for (const text of ["Andina S.A.", "Sin contacto", "Sin responsable", "Sin fecha de cierre"])
    expect(within(card).getByText(text)).toBeInTheDocument();
  expect(screen.getByText("1 negocios ganados")).toBeInTheDocument();
});

test("el historial se abre en el modal y se cierra", async () => {
  vi.mocked(dealHistoryAction).mockResolvedValue({ data: [] });
  const user = userEvent.setup();
  view();
  await user.click(screen.getByRole("button", { name: "Historial" }));
  const modal = screen.getByRole("dialog", { name: "Historial del negocio" });
  expect(dealHistoryAction).toHaveBeenCalledWith("d1");
  await user.click(within(modal).getByRole("button", { name: "Cerrar" }));
  expect(modal).not.toHaveAttribute("open");
});

test("eliminar un negocio muestra el error del API o confirma y refresca", async () => {
  vi.mocked(deleteDealAction).mockResolvedValueOnce({ error: "Tiene una cotización." });
  vi.mocked(deleteDealAction).mockResolvedValueOnce({});
  const user = userEvent.setup();
  view();
  await user.click(screen.getByRole("button", { name: "Eliminar Cuenta Andina" }));
  const modal = screen.getByRole("dialog", { name: "Eliminar negocio" });
  await user.click(within(modal).getByRole("button", { name: "Eliminar negocio" }));
  await waitFor(() => expect(within(modal).getByRole("alert")).toHaveTextContent("Tiene una cotización."));
  await waitFor(() => expect(screen.queryByText("Guardando cambio...")).toBeNull());

  await user.click(within(modal).getByRole("button", { name: "Eliminar negocio" }));
  await waitFor(() => expect(screen.getByText("Negocio eliminado.")).toBeInTheDocument());
  expect(router.refresh).toHaveBeenCalled();
  expect(modal).not.toHaveAttribute("open");

  await user.click(screen.getByRole("button", { name: "Eliminar Cuenta Andina" }));
  await user.click(within(modal).getByRole("button", { name: "Cancelar" }));
  expect(modal).not.toHaveAttribute("open");
});
