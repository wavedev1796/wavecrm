import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { loseDealAction, reopenDealAction, winDealAction } from "./actions";
import { DealActions } from "./deal-actions";
import { baseDeal } from "./deal-fixture";
import type { DealDetail } from "./types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("./actions", () => ({
  winDealAction: vi.fn(),
  loseDealAction: vi.fn(),
  reopenDealAction: vi.fn(),
  saveDeal: vi.fn(),
}));
const view = (deal: DealDetail) =>
  render(<DealActions deal={deal} pipelines={[]} contacts={[]} companies={[]} users={[]} />);

test("ganar muestra el total de la cotizacion y envia la fecha elegida", async () => {
  vi.mocked(winDealAction).mockResolvedValue({ data: {} });
  const user = userEvent.setup();
  view(baseDeal);
  await user.click(screen.getByRole("button", { name: "Ganar" }));
  const dialog = screen.getByRole("dialog", { name: "Ganar negocio" });
  expect(dialog).toHaveTextContent("135,00");
  const date = within(dialog).getByLabelText("Fecha de ganado");
  await user.clear(date);
  await user.type(date, "2026-10-05");
  await user.click(within(dialog).getByRole("button", { name: "Ganar y crear cotización" }));
  expect(winDealAction).toHaveBeenCalledWith("d1", "2026-10-05");
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Negocio ganado."));
});

test("perder con Otro pide detalle antes de cerrar el dialogo", async () => {
  vi.mocked(loseDealAction).mockResolvedValue({
    fieldErrors: { lossDetail: "Cuenta el motivo (entre 2 y 500 caracteres)." },
  });
  const user = userEvent.setup();
  view(baseDeal);
  await user.click(screen.getByRole("button", { name: "Perder" }));
  const dialog = screen.getByRole("dialog", { name: "Perder negocio" });
  await user.selectOptions(within(dialog).getByLabelText("Motivo de la pérdida"), "OTHER");
  await user.click(within(dialog).getByRole("button", { name: "Marcar como perdido" }));
  expect(loseDealAction).toHaveBeenCalledWith("d1", "OTHER", "");
  expect(await within(dialog).findByText(/Cuenta el motivo/)).toBeInTheDocument();
});

test("un ganado solo ofrece reabrir y avisa que se elimina el borrador", async () => {
  vi.mocked(reopenDealAction).mockResolvedValue({ data: {} });
  const user = userEvent.setup();
  view({ ...baseDeal, status: "WON" });
  expect(screen.queryByRole("button", { name: "Ganar" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Reabrir" }));
  const dialog = screen.getByRole("dialog", { name: "Reabrir negocio" });
  expect(dialog).toHaveTextContent("se elimina su cotización en borrador");
  await user.click(within(dialog).getByRole("button", { name: "Reabrir negocio" }));
  expect(reopenDealAction).toHaveBeenCalledWith("d1");
});
