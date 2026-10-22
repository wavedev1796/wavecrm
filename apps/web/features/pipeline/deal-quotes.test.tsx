import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { acceptQuoteAction, createQuoteAction } from "./actions";
import { baseDeal } from "./deal-fixture";
import { DealQuotes } from "./deal-quotes";
import type { Quote } from "./types";

const router = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("./actions", () => ({ createQuoteAction: vi.fn(), acceptQuoteAction: vi.fn() }));
const quote = (overrides: Partial<Quote> = {}): Quote => ({
  id: "q1",
  number: "COT-000001",
  status: "SENT",
  subtotal: "120.00",
  tax: "15.00",
  total: "135.00",
  createdAt: "2026-10-18T12:00:00.000Z",
  sentAt: "2026-10-18T00:00:00.000Z",
  validUntil: "2026-11-30T00:00:00.000Z",
  acceptedAt: null,
  acceptanceNote: null,
  ...overrides,
});

test("registra la propuesta con su vigencia y fecha de envío", async () => {
  vi.mocked(createQuoteAction).mockResolvedValue({});
  const user = userEvent.setup();
  render(<DealQuotes deal={baseDeal} locked={false} />);
  expect(screen.getByText(/Aún no hay propuestas/)).toBeInTheDocument();
  await user.type(screen.getByLabelText("Vigente hasta"), "2026-11-30");
  await user.click(screen.getByRole("button", { name: "Registrar propuesta" }));
  const form = vi.mocked(createQuoteAction).mock.calls[0]?.[1] as FormData;
  expect(form.get("validUntil")).toBe("2026-11-30");
  expect(form.get("sentAt")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Propuesta registrada."));
  expect(router.refresh).toHaveBeenCalled();
});

test("la propuesta enviada se marca como aceptada con su evidencia", async () => {
  vi.mocked(acceptQuoteAction).mockResolvedValue({});
  const user = userEvent.setup();
  render(<DealQuotes deal={{ ...baseDeal, quotes: [quote()] }} locked={false} />);
  const row = screen.getByRole("row", { name: /COT-000001/ });
  expect(row).toHaveTextContent("Enviada");
  expect(row).toHaveTextContent(/135,00/);
  await user.type(screen.getByLabelText("Evidencia de aceptación"), "Orden de compra 55");
  await user.click(screen.getByRole("button", { name: "Marcar aceptada" }));
  expect(vi.mocked(acceptQuoteAction).mock.calls[0]?.slice(0, 2)).toEqual(["d1", "q1"]);
  const form = vi.mocked(acceptQuoteAction).mock.calls[0]?.[2] as FormData;
  expect(form.get("acceptanceNote")).toBe("Orden de compra 55");
});

test("un error del API se muestra junto al formulario", async () => {
  vi.mocked(createQuoteAction).mockResolvedValue({ error: "Agrega sus productos antes de registrar la propuesta." });
  const user = userEvent.setup();
  render(<DealQuotes deal={baseDeal} locked={false} />);
  await user.type(screen.getByLabelText("Vigente hasta"), "2026-11-30");
  await user.click(screen.getByRole("button", { name: "Registrar propuesta" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Agrega sus productos");
});

test("sin productos no ofrece registrar y un cerrado muestra las propuestas sin acciones", () => {
  const { unmount } = render(<DealQuotes deal={{ ...baseDeal, items: [] }} locked={false} />);
  expect(screen.getByText("Agrega productos para registrar una propuesta.")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Registrar propuesta" })).toBeNull();
  unmount();
  render(
    <DealQuotes
      deal={{
        ...baseDeal,
        status: "WON",
        quotes: [
          quote({ status: "ACCEPTED", acceptedAt: "2026-10-19T00:00:00.000Z", acceptanceNote: "Orden 55" }),
          quote({ id: "q0", number: "COT-000000", status: "SUPERSEDED" }),
        ],
      }}
      locked
    />,
  );
  const table = screen.getByRole("table");
  expect(within(table).getByRole("row", { name: /COT-000001/ })).toHaveTextContent("Orden 55");
  expect(within(table).getByRole("row", { name: /COT-000000/ })).toHaveTextContent("Desactualizada");
  expect(screen.queryByRole("button")).toBeNull();
});
