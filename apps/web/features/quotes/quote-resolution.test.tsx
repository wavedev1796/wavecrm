import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { acceptQuoteAction, rejectQuoteAction } from "../pipeline/actions";
import { QuoteResolution } from "./quote-resolution";

vi.mock("../pipeline/actions", () => ({ acceptQuoteAction: vi.fn(), rejectQuoteAction: vi.fn() }));

test("rechazar envía fecha y motivo; un error del API queda en el diálogo abierto", async () => {
  vi.mocked(rejectQuoteAction).mockResolvedValueOnce({ error: "La cotización venció." }).mockResolvedValueOnce({});
  const user = userEvent.setup();
  render(<QuoteResolution dealId="d1" quoteId="q1" number="COT-000001" />);

  await user.click(screen.getByRole("button", { name: "Rechazar COT-000001" }));
  const dialog = screen.getByRole("dialog", { name: "Registrar rechazo de COT-000001" });
  await user.type(screen.getByLabelText(/Motivo del rechazo/), "Eligió otro proveedor");
  await user.click(screen.getByRole("button", { name: "Registrar rechazo" }));

  expect(await screen.findByText("La cotización venció.")).toBeInTheDocument();
  expect(dialog).toHaveAttribute("open");
  const [dealId, quoteId, form] = vi.mocked(rejectQuoteAction).mock.calls[0] ?? [];
  expect([dealId, quoteId, form?.get("rejectionNote")]).toEqual(["d1", "q1", "Eligió otro proveedor"]);
  expect(form?.get("rejectedAt")).toMatch(/^\d{4}-\d{2}-\d{2}$/);

  await user.click(screen.getByRole("button", { name: "Registrar rechazo" }));
  await waitFor(() => expect(dialog).not.toHaveAttribute("open"));
  expect(acceptQuoteAction).not.toHaveBeenCalled();
});

test("aceptar usa la acción de aceptación con su evidencia", async () => {
  vi.mocked(acceptQuoteAction).mockResolvedValue({});
  const user = userEvent.setup();
  render(<QuoteResolution dealId="d1" quoteId="q1" number="COT-000001" />);

  await user.click(screen.getByRole("button", { name: "Aceptar COT-000001" }));
  await user.type(screen.getByLabelText(/Evidencia de aceptación/), "Orden de compra 55");
  await user.click(screen.getByRole("button", { name: "Registrar aceptación" }));

  await waitFor(() => expect(acceptQuoteAction).toHaveBeenCalledOnce());
  expect(vi.mocked(acceptQuoteAction).mock.calls[0]?.[2].get("acceptanceNote")).toBe("Orden de compra 55");
});
