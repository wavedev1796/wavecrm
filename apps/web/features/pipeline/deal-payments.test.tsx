import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, test, vi } from "vitest";
import { addPaymentAction, deletePaymentAction } from "./actions";
import { baseDeal } from "./deal-fixture";
import { DealPayments } from "./deal-payments";
import type { DealDetail } from "./types";

vi.mock("./actions", () => ({ addPaymentAction: vi.fn(), deletePaymentAction: vi.fn() }));
const add = vi.mocked(addPaymentAction);
const remove = vi.mocked(deletePaymentAction);
afterEach(() => vi.unstubAllGlobals());

/** Total 135 (fixture) con un abono de 100: saldo 35, como lo calcula el API. */
const paid: DealDetail = {
  ...baseDeal,
  payments: [
    { id: "pay-1", amount: "100", paidAt: "2026-11-12T00:00:00.000Z", note: "Transferencia", createdBy: { id: "u1", name: "Zaith" } },
  ],
  balance: { due: "135.00", paid: "100.00", pending: "35.00" },
};

test("muestra lo que se cobra, lo abonado y el saldo, y lista cada abono con su fecha, autor y nota", () => {
  render(<DealPayments deal={paid} canDelete={false} />);
  const resumen = screen.getByText("Saldo pendiente").closest("dl")!;
  expect(resumen).toHaveTextContent(/Total a cobrar.*135,00/);
  expect(resumen).toHaveTextContent(/Abonado.*100,00/);
  expect(resumen).toHaveTextContent(/Saldo pendiente.*35,00/);
  const lista = screen.getByRole("list", { name: "Abonos registrados" });
  expect(within(lista).getByText(/12 nov.* 2026 · Zaith/)).toBeInTheDocument();
  expect(within(lista).getByText("Transferencia")).toBeInTheDocument();
  // Un VENDEDOR no borra abonos.
  expect(screen.queryByRole("button", { name: /Borrar el abono/ })).toBeNull();
});

test("registrar un abono muestra el error del campo o confirma y limpia el formulario", async () => {
  add.mockResolvedValueOnce({ fieldErrors: { amount: "Ingresa el abono con coma para los centavos, por ejemplo 250 o 250,50." } });
  add.mockResolvedValueOnce({});
  const user = userEvent.setup();
  render(<DealPayments deal={{ ...baseDeal, payments: [] }} canDelete={false} />);
  expect(screen.getByText("Aún no hay abonos registrados.")).toBeInTheDocument();
  const monto = screen.getByLabelText(/Monto \(USD\)/);
  await user.type(monto, "8.45");
  await user.click(screen.getByRole("button", { name: "Registrar abono" }));
  expect(await screen.findByText(/por ejemplo 250 o 250,50/)).toBeInTheDocument();
  expect(monto).toHaveValue("8.45");
  await user.clear(monto);
  await user.type(monto, "35");
  await user.type(screen.getByLabelText(/Nota/), "Efectivo");
  await user.click(screen.getByRole("button", { name: "Registrar abono" }));
  expect(await screen.findByText("Abono registrado.")).toBeInTheDocument();
  const [dealId, form] = add.mock.calls[1]!;
  expect([dealId, form.get("amount"), form.get("note")]).toEqual(["d1", "35", "Efectivo"]);
  expect(monto).toHaveValue("");
});

test("un ADMIN borra un abono tras confirmar; un rechazado no recibe abonos", async () => {
  vi.stubGlobal("confirm", vi.fn(() => true));
  remove.mockResolvedValue({});
  const user = userEvent.setup();
  const { rerender } = render(<DealPayments deal={paid} canDelete />);
  await user.click(screen.getByRole("button", { name: /Borrar el abono de .*100,00/ }));
  expect(window.confirm).toHaveBeenCalledWith("¿Borrar este abono? Queda registrado en el historial.");
  await waitFor(() => expect(remove).toHaveBeenCalledWith("d1", "pay-1"));
  expect(await screen.findByText("Abono borrado.")).toBeInTheDocument();
  rerender(<DealPayments deal={{ ...paid, status: "REJECTED" }} canDelete />);
  expect(screen.getByText("Reversa el negocio para registrar abonos.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Registrar abono" })).toBeNull();
});
