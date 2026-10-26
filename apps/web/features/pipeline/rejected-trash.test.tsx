import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { deleteRejectedAction, previewTransitionAction } from "./actions";
import { RejectedTrash } from "./rejected-trash";
import type { RejectedDeal } from "./types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("./actions", () => ({
  deleteRejectedAction: vi.fn(),
  previewTransitionAction: vi.fn(),
  completeTransitionAction: vi.fn(),
  saveTransitionAction: vi.fn(),
}));
const remove = vi.mocked(deleteRejectedAction);
const rejected = (id: string, title: string, extra: Partial<RejectedDeal> = {}): RejectedDeal => ({
  id,
  title,
  value: "500.00",
  currency: "USD",
  status: "REJECTED",
  pipelineId: "p1",
  stageId: "s2",
  contactId: "c1",
  companyId: null,
  ownerId: "u1",
  expectedClose: null,
  contact: { id: "c1", firstName: "Ana", lastName: "Paz" },
  company: { id: "e1", name: "Comercial Andina" },
  owner: { id: "u1", name: "Eduardo" },
  pipeline: { id: "p1", name: "Ventas" },
  closedAt: "2026-10-20T00:00:00.000Z",
  lossReason: "DO_NOT_CONTACT",
  lossDetail: "Pidió no volver a llamar",
  ...extra,
});
const deals = [
  rejected("d1", "Cuenta Andina"),
  rejected("d2", "Portal Sierra", { contact: null, owner: null, lossReason: null, lossDetail: null, closedAt: null }),
];

test("muestra cada rechazado con su motivo y sus respaldos; sin ADMIN no hay Reabrir", () => {
  render(<RejectedTrash deals={deals} canReopen={false} />);
  const [first, second] = screen.getAllByRole("row").slice(1);
  expect(within(first!).getByRole("link", { name: /Cuenta Andina/ })).toHaveAttribute("href", "/pipeline/d1");
  expect(first).toHaveTextContent("Cliente solicita no ser contactado");
  expect(first).toHaveTextContent("Pidió no volver a llamar");
  expect(first).toHaveTextContent("Comercial Andina");
  expect(second).toHaveTextContent("Sin contacto");
  expect(second).toHaveTextContent("Sin responsable");
  expect(screen.queryByRole("columnheader", { name: "Acciones" })).toBeNull();
  expect(screen.queryByRole("button", { name: /Reabrir/ })).toBeNull();
  expect(screen.getByRole("button", { name: "Eliminar seleccionados (0)" })).toBeDisabled();
});

test("seleccionar todos, confirmar y eliminar envía los ids; un error se muestra", async () => {
  remove.mockResolvedValueOnce({ error: "No se pudo eliminar." }).mockResolvedValueOnce({ data: { deleted: 2 } });
  const user = userEvent.setup();
  render(<RejectedTrash deals={deals} canReopen={false} />);
  await user.click(screen.getByLabelText("Seleccionar todos"));
  await user.click(screen.getByRole("button", { name: "Eliminar seleccionados (2)" }));
  const dialog = screen.getByRole("dialog", { name: "Eliminar de la papelera" });
  expect(dialog).toHaveTextContent("Se eliminarán 2 negocios con sus productos, propuestas y actividades.");
  await user.click(within(dialog).getByRole("button", { name: "Eliminar definitivamente" }));
  expect(await screen.findByText("No se pudo eliminar.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Eliminar seleccionados (2)" })).toBeEnabled();

  await user.click(screen.getByRole("button", { name: "Eliminar seleccionados (2)" }));
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Eliminar definitivamente" }));
  expect(await screen.findByText("Se eliminaron 2 negocios.")).toBeInTheDocument();
  expect(remove).toHaveBeenLastCalledWith(["d1", "d2"]);
  expect(screen.getByRole("button", { name: "Eliminar seleccionados (0)" })).toBeDisabled();
});

test("cancelar la confirmación no elimina y conserva la selección", async () => {
  const user = userEvent.setup();
  render(<RejectedTrash deals={deals} canReopen={false} />);
  await user.click(screen.getByLabelText("Seleccionar Portal Sierra"));
  await user.click(screen.getByRole("button", { name: "Eliminar seleccionados (1)" }));
  expect(screen.getByRole("dialog")).toHaveTextContent("Se eliminará 1 negocio");
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancelar" }));
  expect(remove).not.toHaveBeenCalled();
  expect(screen.getByLabelText("Seleccionar Portal Sierra")).toBeChecked();
});

test("un ADMIN reabre desde la papelera con el motivo del cambio", async () => {
  vi.mocked(previewTransitionAction).mockResolvedValue({
    data: { pending: [{ code: "REASON", message: "Cuenta el motivo del cambio." }], quote: null, items: 0 },
  });
  const user = userEvent.setup();
  render(<RejectedTrash deals={deals} canReopen />);
  await user.click(screen.getByRole("button", { name: "Reabrir Cuenta Andina" }));
  const dialog = screen.getByRole("dialog", { name: "Reabrir negocio" });
  expect(await within(dialog).findByLabelText("Motivo del cambio")).toBeInTheDocument();
  await waitFor(() => expect(previewTransitionAction).toHaveBeenCalledWith("d1", "REOPEN"));
});

test("la papelera vacía lo explica", () => {
  render(<RejectedTrash deals={[]} canReopen />);
  expect(screen.getByText(/La papelera está vacía/)).toBeInTheDocument();
  expect(screen.getByLabelText("Seleccionar todos")).toBeDisabled();
});
