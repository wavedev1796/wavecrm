import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { PipelineBoard } from "./pipeline-board";
import {
  completeTransitionAction,
  dealHistoryAction,
  deleteDealAction,
  loadColumnAction,
  previewTransitionAction,
} from "./actions";
import type { Board, Deal, Stage } from "./types";
const router = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("./actions", () => ({
  previewTransitionAction: vi.fn(),
  completeTransitionAction: vi.fn(),
  loadColumnAction: vi.fn(),
  saveDeal: vi.fn(),
  configurePipelineAction: vi.fn(),
  dealHistoryAction: vi.fn().mockResolvedValue({ data: [] }),
  deleteDealAction: vi.fn(),
}));
const preview = vi.mocked(previewTransitionAction);
const complete = vi.mocked(completeTransitionAction);
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
  { id: "s1", name: "Inicial", color: "#2f6f8f", position: 0, probability: 10, count: 1, value: "1250.25", deals: [deal] },
  { id: "s2", name: "Ganado", color: null, position: 1, probability: 100, count: 0, value: "0", deals: [] },
];
const zero = { count: 0, value: "0.00" };
const board = (overrides: Partial<Board> = {}): Board => ({
  pipeline: { id: "p1", name: "Ventas", isDefault: true },
  stages,
  lost: { count: 0, value: "0.00", deals: [] },
  metrics: { open: { count: 1, value: "1250.25" }, won: zero, lost: zero, rejected: zero },
  ...overrides,
});
const props = {
  pipelines: [{ id: "p1", name: "Ventas", isDefault: true, stages }],
  contacts: [{ id: "c1", name: "Ana Paz" }],
  companies: [],
  users: [{ id: "u1", name: "Eduardo" }],
};
function view(data = board()) {
  return render(<PipelineBoard {...data} {...props} />);
}
const moveTo = () => {
  preview.mockResolvedValue({ data: { pending: [], quote: null, items: 0 } });
  complete.mockResolvedValue({ done: true });
};

test("crear desde una columna abre el modal con esa etapa y controles Wave", async () => {
  const user = userEvent.setup();
  view();
  await user.click(within(screen.getByRole("region", { name: "Etapa Ganado" })).getByRole("button", { name: "Crear negocio" }));
  const modal = screen.getByRole("dialog", { name: "Crear nuevo negocio" });
  expect(within(modal).getByLabelText("Etapa", { exact: true })).toHaveValue("s2");
  for (const label of ["Pipeline", "Etapa", "Contacto", "Empresa", "Responsable"])
    expect(within(modal).getByLabelText(label, { exact: true })).toHaveClass("select-control");
  expect(within(modal).getByLabelText("Monto (USD)")).toHaveClass("input");
  expect(within(modal).queryByLabelText("Estado", { exact: true })).toBeNull();
});

test("el titulo de la tarjeta abre la ficha del negocio", () => {
  view();
  expect(screen.getByRole("link", { name: "Cuenta Andina" })).toHaveAttribute("href", "/pipeline/d1");
});

test("con productos el monto se ve pero no se edita; al editar la etapa no cambia", async () => {
  const user = userEvent.setup();
  view(board({ stages: [{ ...stages[0]!, deals: [{ ...deal, _count: { items: 2 } }] }, stages[1]!] }));
  await user.click(screen.getByRole("button", { name: "Editar" }));
  const modal = screen.getByRole("dialog", { name: "Editar negocio" });
  expect(within(modal).getByLabelText("Monto (USD)")).toHaveAttribute("readonly");
  expect(within(modal).getByText("Se calcula con los productos de la ficha.")).toBeInTheDocument();
  expect(within(modal).getByLabelText("Etapa", { exact: true })).toBeDisabled();
  expect(within(modal).getByLabelText("Pipeline", { exact: true })).toBeDisabled();
  expect(within(modal).getByText("Cambia la etapa desde el tablero o la ficha.")).toBeInTheDocument();
});

test("un movimiento rechazado muestra el error en el modal y conserva la etapa visible", async () => {
  preview.mockResolvedValue({ error: "No se pudo guardar." });
  const user = userEvent.setup();
  view();
  await user.selectOptions(screen.getByLabelText("Mover Cuenta Andina de etapa"), "s2");
  const modal = screen.getByRole("dialog", { name: "Cambiar de etapa" });
  await waitFor(() => expect(within(modal).getByRole("alert")).toHaveTextContent("No se pudo guardar."));
  expect(screen.getByLabelText("Mover Cuenta Andina de etapa")).toHaveValue("s1");
});

test("el selector y el arrastre piden el mismo cambio con las mismas reglas", async () => {
  moveTo();
  const user = userEvent.setup();
  view();
  await user.selectOptions(screen.getByLabelText("Mover Cuenta Andina de etapa"), "s2");
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Cuenta Andina pasó a Ganado."));
  const bySelect = [preview.mock.calls[0], complete.mock.calls[0]?.slice(0, 3)];

  preview.mockClear();
  complete.mockClear();
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
  await waitFor(() => expect(complete).toHaveBeenCalled());
  expect([preview.mock.calls[0], complete.mock.calls[0]?.slice(0, 3)]).toEqual(bySelect);
  expect(bySelect).toEqual([["d1", "s2"], ["d1", "s2", "s1"]]);
  expect(dataTransfer.setData).toHaveBeenCalledWith("text/plain", "d1");

  fireEvent.dragStart(card, { dataTransfer });
  fireEvent.dragEnd(card);
  expect(card).not.toHaveClass("deal-card--dragging");
  fireEvent.drop(screen.getByRole("region", { name: "Etapa Inicial" }), { dataTransfer });
  expect(preview).toHaveBeenCalledTimes(1);
});

test("soltar una tarjeta en Perdido abre el modal con el motivo de la pérdida", async () => {
  preview.mockResolvedValue({
    data: { pending: [{ code: "LOSS_REASON", message: "Elige el motivo de la pérdida." }], quote: null, items: 0 },
  });
  view();
  const dataTransfer = { setData: vi.fn(), dropEffect: "", effectAllowed: "" };
  fireEvent.dragStart(screen.getByRole("article", { name: "Negocio Cuenta Andina" }), { dataTransfer });
  fireEvent.dragOver(screen.getByRole("region", { name: "Columna Perdido" }), { dataTransfer });
  fireEvent.drop(screen.getByRole("region", { name: "Columna Perdido" }), { dataTransfer });
  expect(await screen.findByLabelText("Motivo de la pérdida")).toBeInTheDocument();
  expect(preview).toHaveBeenCalledWith("d1", "LOST");
});

test("la zona Rechazado cuenta la papelera, enlaza a ella y al soltar pide el motivo del rechazo", async () => {
  preview.mockResolvedValue({
    data: { pending: [{ code: "REJECTION_REASON", message: "Elige el motivo del rechazo." }], quote: null, items: 0 },
  });
  view(board({ metrics: { open: { count: 1, value: "1250.25" }, won: zero, lost: zero, rejected: { count: 3, value: "10.00" } } }));
  const zone = screen.getByRole("region", { name: "Zona Rechazado" });
  expect(within(zone).getByText("3 negocios en la papelera")).toBeInTheDocument();
  expect(within(zone).getByRole("link", { name: "Ver papelera" })).toHaveAttribute("href", "/pipeline/papelera");
  expect(within(screen.getByLabelText("Mover Cuenta Andina de etapa")).getByRole("option", { name: "Rechazado" })).toBeInTheDocument();
  const dataTransfer = { setData: vi.fn(), dropEffect: "", effectAllowed: "" };
  fireEvent.dragStart(screen.getByRole("article", { name: "Negocio Cuenta Andina" }), { dataTransfer });
  fireEvent.dragOver(zone, { dataTransfer });
  expect(zone).toHaveClass("pipeline-column--over");
  fireEvent.drop(zone, { dataTransfer });
  expect(await screen.findByLabelText("Motivo del rechazo")).toBeInTheDocument();
  expect(preview).toHaveBeenCalledWith("d1", "REJECTED");
});

test("las métricas salen del API y los perdidos no suman al valor abierto ni al ganado", () => {
  const lostDeal = { ...deal, id: "d9", title: "Cuenta perdida", status: "LOST" as const, value: "999" };
  view(
    board({
      lost: { count: 1, value: "999.00", deals: [lostDeal] },
      metrics: { open: { count: 1, value: "1250.25" }, won: { count: 0, value: "0.00" }, lost: { count: 1, value: "999.00" }, rejected: { count: 2, value: "300.00" } },
    }),
  );
  const kpis = screen.getByRole("region", { name: "Resumen comercial" });
  expect(within(kpis).getByText("Valor abierto").parentElement).toHaveTextContent(/1\.250,25/);
  expect(within(kpis).getByText("Valor ganado").parentElement).toHaveTextContent(/0,00/);
  expect(within(kpis).getByText("Perdidos").parentElement).toHaveTextContent("1");
  expect(within(kpis).getByText("2 negocios en este pipeline")).toBeInTheDocument();
  const lost = screen.getByRole("region", { name: "Columna Perdido" });
  expect(within(lost).getByRole("article", { name: "Negocio Cuenta perdida" })).toBeInTheDocument();
  expect(within(lost).getByLabelText("Mover Cuenta perdida de etapa")).toHaveValue("LOST");
});

test("ver más pide la página siguiente de la columna, la añade y se reinicia al refrescar", async () => {
  const more = { ...deal, id: "d2", title: "Otra cuenta" };
  vi.mocked(loadColumnAction).mockResolvedValue({ data: { deals: [more] } });
  const user = userEvent.setup();
  const data = board({ stages: [{ ...stages[0]!, count: 12 }, stages[1]!] });
  const { rerender } = view(data);
  await user.click(screen.getByRole("button", { name: "Ver más (quedan 11)" }));
  expect(loadColumnAction).toHaveBeenCalledWith("p1", "s1", 2);
  expect(await screen.findByRole("article", { name: "Negocio Otra cuenta" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Ver más (quedan 10)" })).toBeInTheDocument();

  rerender(<PipelineBoard {...board({ stages: [{ ...stages[0]!, count: 12 }, stages[1]!] })} {...props} />);
  await waitFor(() => expect(screen.queryByRole("article", { name: "Negocio Otra cuenta" })).toBeNull());
  expect(screen.getByRole("button", { name: "Ver más (quedan 11)" })).toBeInTheDocument();
});

test("cambiar de pipeline navega con su id", async () => {
  const user = userEvent.setup();
  render(
    <PipelineBoard
      {...board()}
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
  view(board({ stages: [], metrics: { open: zero, won: zero, lost: zero, rejected: zero } }));
  expect(screen.getByText(/Agrega una etapa en Configurar pipeline/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Nuevo negocio" })).toBeDisabled();
  expect(screen.getByText("0 negocios en este pipeline")).toBeInTheDocument();
});

test("una tarjeta ganada sin contacto, responsable ni fecha muestra sus textos de respaldo", () => {
  const won: Deal = { ...deal, status: "WON", contact: null, owner: null, expectedClose: null, company: { id: "co1", name: "Andina S.A." } };
  view(board({ stages: [{ ...stages[0]!, deals: [won] }, stages[1]!], metrics: { open: zero, won: { count: 1, value: "1250.25" }, lost: zero, rejected: zero } }));
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
  expect(modal).not.toHaveAttribute("open");

  await user.click(screen.getByRole("button", { name: "Eliminar Cuenta Andina" }));
  await user.click(within(modal).getByRole("button", { name: "Cancelar" }));
  expect(modal).not.toHaveAttribute("open");
});
