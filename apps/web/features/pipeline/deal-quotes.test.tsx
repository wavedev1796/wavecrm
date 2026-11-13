import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { acceptQuoteAction, createQuoteAction } from "./actions";
import { baseDeal } from "./deal-fixture";
import { DealQuotes } from "./deal-quotes";
import type { Quote } from "./types";

vi.mock("./actions", () => ({
  createQuoteAction: vi.fn(),
  acceptQuoteAction: vi.fn(),
}));
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
  expect(screen.getByText(/Aún no hay cotizaciones/)).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Preparar cotización" }));
  await user.type(screen.getByLabelText("Vigente hasta"), "2026-11-30");
  await user.click(
    screen.getByRole("button", { name: "Registrar como enviada" }),
  );
  const form = vi.mocked(createQuoteAction).mock.calls[0]?.[1] as FormData;
  expect(form.get("validUntil")).toBe("2026-11-30");
  expect(form.get("sentAt")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  await waitFor(() =>
    expect(screen.getByRole("status")).toHaveTextContent(
      "El CRM no generó ni envió un documento.",
    ),
  );
});

test("la propuesta enviada se marca como aceptada con su evidencia", async () => {
  vi.mocked(acceptQuoteAction).mockResolvedValue({});
  const user = userEvent.setup();
  render(
    <DealQuotes deal={{ ...baseDeal, quotes: [quote()] }} locked={false} />,
  );
  expect(screen.getByText("COT-000001")).toBeInTheDocument();
  expect(screen.getAllByText("Enviada").length).toBeGreaterThan(0);
  expect(screen.getAllByText(/135,00/).length).toBeGreaterThan(0);
  await user.click(screen.getByRole("button", { name: "Registrar aceptación" }));
  await user.type(
    screen.getByLabelText("Evidencia de aceptación"),
    "Orden de compra 55",
  );
  await user.click(screen.getByRole("button", { name: "Marcar aceptada" }));
  expect(vi.mocked(acceptQuoteAction).mock.calls[0]?.slice(0, 2)).toEqual([
    "d1",
    "q1",
  ]);
  const form = vi.mocked(acceptQuoteAction).mock.calls[0]?.[2] as FormData;
  expect(form.get("acceptanceNote")).toBe("Orden de compra 55");
});

test("un error del API se muestra junto al formulario", async () => {
  vi.mocked(createQuoteAction).mockResolvedValue({
    error: "Agrega sus productos antes de registrar la propuesta.",
  });
  const user = userEvent.setup();
  render(<DealQuotes deal={baseDeal} locked={false} />);
  await user.click(screen.getByRole("button", { name: "Preparar cotización" }));
  await user.type(screen.getByLabelText("Vigente hasta"), "2026-11-30");
  await user.click(
    screen.getByRole("button", { name: "Registrar como enviada" }),
  );
  const alerts = await screen.findAllByRole("alert");
  expect(alerts.some((alert) => alert.textContent?.includes("Agrega sus productos"))).toBe(true);
});

test("cada propuesta muestra la copia de sus productos; las anteriores, que no tienen detalle", async () => {
  const user = userEvent.setup();
  render(
    <DealQuotes
      deal={{
        ...baseDeal,
        quotes: [
          quote({
            version: 2,
            items: [
              {
                description: "Vinos",
                quantity: "2",
                unitPrice: "100",
                taxRate: 15,
                discountRate: 10,
              },
            ],
          }),
          quote({
            id: "q0",
            number: "COT-000000",
            status: "SUPERSEDED",
            items: [],
          }),
        ],
      }}
      locked={false}
    />,
  );
  await user.click(screen.getByText("Productos de COT-000001"));
  const line = screen.getByText("2 × Vinos").closest("li")!;
  expect(line).toHaveTextContent(/100,00 c\/u · descuento 10 % · IVA 15 %/);
  expect(line).toHaveTextContent(/180,00/);
  expect(
    screen.getByText("Registrada sin detalle de productos."),
  ).toBeInTheDocument();
});

test("bloquea registrar si hay cambios sin guardar o falta un cliente identificable", () => {
  const { rerender } = render(
    <DealQuotes deal={baseDeal} locked={false} hasUnsavedItems />,
  );
  expect(
    screen.getByText(
      "Guarda las líneas editadas antes de registrar esta versión.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Preparar cotización" }),
  ).toBeDisabled();
  rerender(<DealQuotes deal={{ ...baseDeal, company: null }} locked={false} />);
  expect(
    screen.getByText(
      "Asocia un contacto o empresa con nombre antes de registrar la cotización.",
    ),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Preparar cotización" }),
  ).toBeDisabled();
});

test("una versión existente se conserva y la acción invita a crear otra versión", () => {
  render(
    <DealQuotes
      deal={{ ...baseDeal, quotes: [quote({ version: 1 })] }}
      locked={false}
    />,
  );
  expect(screen.getByText(/COT-000001 · v1/)).toBeInTheDocument();
  expect(
    screen.getByText(/Las versiones registradas conservan su contenido/),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Registrar nueva versión" }),
  ).toBeInTheDocument();
});

test("sin productos no ofrece registrar y un cerrado muestra las propuestas sin acciones", () => {
  const { unmount } = render(
    <DealQuotes deal={{ ...baseDeal, items: [] }} locked={false} />,
  );
  expect(
    screen.getByText("Agrega al menos una línea para preparar la cotización."),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Preparar cotización" }),
  ).toBeDisabled();
  unmount();
  render(
    <DealQuotes
      deal={{
        ...baseDeal,
        status: "WON",
        quotes: [
          quote({
            status: "ACCEPTED",
            acceptedAt: "2026-10-19T00:00:00.000Z",
            acceptanceNote: "Orden 55",
          }),
          quote({ id: "q0", number: "COT-000000", status: "SUPERSEDED" }),
        ],
      }}
      locked
    />,
  );
  expect(
    screen.getByText("Orden 55"),
  ).toBeInTheDocument();
  expect(
    screen.getByText("COT-000000"),
  ).toBeInTheDocument();
  expect(screen.getByText("Desactualizada")).toBeInTheDocument();
  expect(screen.queryByRole("button")).toBeNull();
});
