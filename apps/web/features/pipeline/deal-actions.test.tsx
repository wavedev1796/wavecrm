import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { completeTransitionAction, previewTransitionAction } from "./actions";
import { DealActions } from "./deal-actions";
import { baseDeal } from "./deal-fixture";
import type { DealDetail } from "./types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("./actions", () => ({
  previewTransitionAction: vi.fn(),
  completeTransitionAction: vi.fn(),
  saveTransitionAction: vi.fn(),
  saveDeal: vi.fn(),
}));
const preview = vi.mocked(previewTransitionAction);
const view = (deal: DealDetail, canReopen = false) =>
  render(<DealActions deal={deal} pipelines={[]} contacts={[]} companies={[]} users={[]} canReopen={canReopen} />);
const asks = (...codes: string[]) =>
  preview.mockResolvedValue({
    data: { pending: codes.map((code) => ({ code, message: "Falta " + code + "." })) as never, quote: null, items: 2 },
  });

test("ganar abre el modal de transición hacia Ganado y pide la fecha real de cierre", async () => {
  asks("CLOSED_AT");
  const user = userEvent.setup();
  view(baseDeal);
  await user.click(screen.getByRole("button", { name: "Ganar" }));
  const dialog = screen.getByRole("dialog", { name: "Ganar negocio" });
  expect(await within(dialog).findByLabelText("Fecha real de cierre")).toBeInTheDocument();
  expect(preview).toHaveBeenCalledWith("d1", "WON");
});

test("la fecha de cierre propuesta es el día de Ecuador aunque en UTC ya sea el siguiente", async () => {
  asks("CLOSED_AT");
  // 03:00 UTC del 6 de octubre son las 22:00 del 5 en Ecuador.
  vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-10-06T03:00:00Z") });
  try {
    view(baseDeal);
    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole("button", { name: "Ganar" }));
    const date = await within(screen.getByRole("dialog", { name: "Ganar negocio" })).findByLabelText("Fecha real de cierre");
    expect(date).toHaveValue("2026-10-05");
    expect(date).toHaveAttribute("max", "2026-10-05");
  } finally {
    vi.useRealTimers();
  }
});

test("perder abre el mismo modal hacia Perdido", async () => {
  asks("LOSS_REASON");
  const user = userEvent.setup();
  view(baseDeal);
  await user.click(screen.getByRole("button", { name: "Perder" }));
  const dialog = screen.getByRole("dialog", { name: "Perder negocio" });
  expect(await within(dialog).findByLabelText("Motivo de la pérdida")).toBeInTheDocument();
  expect(preview).toHaveBeenCalledWith("d1", "LOST");
});

test("rechazar se ofrece en abiertos y perdidos, no en ganados ni rechazados", async () => {
  asks("REJECTION_REASON");
  const user = userEvent.setup();
  const { unmount } = view({ ...baseDeal, status: "LOST" });
  expect(screen.queryByRole("button", { name: "Ganar" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Rechazar" }));
  const dialog = screen.getByRole("dialog", { name: "Rechazar negocio" });
  expect(await within(dialog).findByLabelText("Motivo del rechazo")).toBeInTheDocument();
  expect(preview).toHaveBeenCalledWith("d1", "REJECTED");
  unmount();
  for (const status of ["WON", "REJECTED"] as const) {
    const { unmount: drop } = view({ ...baseDeal, status });
    expect(screen.queryByRole("button", { name: "Rechazar" })).toBeNull();
    drop();
  }
});

test("reabrir solo aparece para un ADMIN y pide el motivo", async () => {
  const won = { ...baseDeal, status: "WON" as const };
  const { unmount } = view(won);
  expect(screen.queryByRole("button", { name: "Reabrir" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Ganar" })).toBeNull();
  unmount();
  asks("REASON");
  const user = userEvent.setup();
  view(won, true);
  await user.click(screen.getByRole("button", { name: "Reabrir" }));
  const dialog = screen.getByRole("dialog", { name: "Reabrir negocio" });
  expect(await within(dialog).findByLabelText("Motivo del cambio")).toBeInTheDocument();
  expect(preview).toHaveBeenCalledWith("d1", "REOPEN");
});

test("al completar el cambio avisa y refresca la ficha", async () => {
  preview.mockResolvedValue({ data: { pending: [], quote: null, items: 2 } });
  vi.mocked(completeTransitionAction).mockResolvedValue({ done: true });
  const user = userEvent.setup();
  view(baseDeal);
  await user.click(screen.getByRole("button", { name: "Ganar" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Cuenta Andina pasó a Ganado."));
});
