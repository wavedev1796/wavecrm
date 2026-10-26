import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { completeTransitionAction, previewTransitionAction, saveTransitionAction } from "./actions";
import { TransitionDialog } from "./transition-dialog";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("./actions", () => ({
  previewTransitionAction: vi.fn(),
  completeTransitionAction: vi.fn(),
  saveTransitionAction: vi.fn(),
}));
const preview = vi.mocked(previewTransitionAction);
const complete = vi.mocked(completeTransitionAction);
const pending = (...codes: string[]) =>
  codes.map((code) => ({ code, message: "Falta " + code + "." })) as never;

function view(to = "s2", targetName = "Negociación") {
  const props = { onCancel: vi.fn(), onDone: vi.fn() };
  render(
    <TransitionDialog
      deal={{ id: "d1", title: "Cuenta Andina", stageId: "s1" }}
      to={to}
      targetName={targetName}
      contacts={[{ id: "c1", name: "Ana Paz" }]}
      users={[{ id: "u1", name: "Eduardo" }]}
      {...props}
    />,
  );
  return props;
}

test("sin pendientes mueve directo con la etapa vista y avisa", async () => {
  preview.mockResolvedValue({ data: { pending: [], quote: null, items: 0 } });
  complete.mockResolvedValue({ done: true });
  const { onDone } = view();
  await waitFor(() => expect(onDone).toHaveBeenCalledWith("Cuenta Andina pasó a Negociación."));
  expect(preview).toHaveBeenCalledWith("d1", "s2");
  expect(complete).toHaveBeenCalledWith("d1", "s2", "s1", expect.any(FormData));
});

test("con pendientes lista lo que falta y pide cada dato", async () => {
  preview.mockResolvedValue({ data: { pending: pending("CONTACT", "NEED", "NEXT_ACTIVITY", "REASON"), quote: null, items: 0 } });
  view();
  expect(await screen.findByText("Falta NEED.")).toBeInTheDocument();
  expect(screen.getByText(/Para pasar Cuenta Andina a Negociación/)).toBeInTheDocument();
  expect(screen.getByLabelText("Contacto")).toHaveClass("select-control");
  expect(screen.getByLabelText("Necesidad del cliente")).toBeInTheDocument();
  expect(screen.getByLabelText("Programada para")).toHaveAttribute("type", "date");
  expect(screen.getByLabelText("Motivo del cambio")).toBeInTheDocument();
  expect(complete).not.toHaveBeenCalled();
});

test("al confirmar envía lo escrito y, si sigue faltando algo, vuelve a pedirlo sin cerrar", async () => {
  preview
    .mockResolvedValueOnce({ data: { pending: pending("NEED", "NEXT_ACTIVITY"), quote: null, items: 0 } })
    .mockResolvedValueOnce({ data: { pending: pending("NEXT_ACTIVITY"), quote: null, items: 0 } });
  complete.mockResolvedValue({ error: "Faltan datos para este cambio de etapa.", pending: pending("NEXT_ACTIVITY") });
  const user = userEvent.setup();
  const { onDone } = view();
  await user.type(await screen.findByLabelText("Necesidad del cliente"), "Tienda en línea");
  await user.click(screen.getByRole("button", { name: "Guardar y continuar" }));
  await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("Faltan datos para este cambio de etapa."));
  const form = complete.mock.calls[0]?.[3] as FormData;
  expect(form.get("need")).toBe("Tienda en línea");
  await waitFor(() => expect(screen.queryByLabelText("Necesidad del cliente")).toBeNull());
  expect(screen.getByText("Falta NEXT_ACTIVITY.")).toBeInTheDocument();
  expect(onDone).not.toHaveBeenCalled();
});

test("con pendientes recomienda completar la ficha y enlaza a ella", async () => {
  preview.mockResolvedValue({ data: { pending: pending("NEED"), quote: null, items: 0 } });
  view();
  expect(await screen.findByText(/Recomendación: mantén completa la ficha/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Abrir la ficha" })).toHaveAttribute("href", "/pipeline/d1");
  expect(screen.getByRole("button", { name: "Guardar y continuar" })).toBeInTheDocument();
});

test("lo que solo se completa en la ficha guarda lo llenado y lleva a la ficha sin intentar mover", async () => {
  preview.mockResolvedValue({ data: { pending: pending("NEED", "PROPOSAL_SENT", "ACCEPTANCE", "FINAL_AMOUNT"), quote: null, items: 0 } });
  vi.mocked(saveTransitionAction).mockResolvedValue({ done: true });
  const user = userEvent.setup();
  const { onCancel } = view("WON", "Ganado");
  expect(await screen.findByText(/Los productos y las propuestas se registran en la ficha/)).toBeInTheDocument();
  expect(screen.queryByLabelText("Vigente hasta")).toBeNull();
  expect(screen.queryByLabelText("Evidencia de aceptación")).toBeNull();
  await user.type(screen.getByLabelText("Necesidad del cliente"), "Tienda en línea");
  await user.click(screen.getByRole("button", { name: "Guardar e ir a la ficha" }));
  await waitFor(() => expect(push).toHaveBeenCalledWith("/pipeline/d1"));
  expect((vi.mocked(saveTransitionAction).mock.calls[0]?.[2] as FormData).get("need")).toBe("Tienda en línea");
  expect(onCancel).toHaveBeenCalled();
  expect(complete).not.toHaveBeenCalled();
});

test("si guardar falla, el error se muestra y no navega", async () => {
  push.mockClear();
  preview.mockResolvedValue({ data: { pending: pending("PROPOSAL_SENT"), quote: null, items: 0 } });
  vi.mocked(saveTransitionAction).mockResolvedValue({ error: "Ingresa hasta cuándo es válida la propuesta." });
  const user = userEvent.setup();
  view("s3", "Propuesta");
  await user.click(await screen.findByRole("button", { name: "Guardar e ir a la ficha" }));
  expect(await screen.findByText("Ingresa hasta cuándo es válida la propuesta.")).toBeInTheDocument();
  expect(push).not.toHaveBeenCalled();
});

test("rechazar avisa que invalida el proceso y ofrece solo los motivos del rechazo", async () => {
  preview.mockResolvedValue({ data: { pending: pending("REJECTION_REASON"), quote: null, items: 0 } });
  view("REJECTED", "Rechazado");
  const select = await screen.findByLabelText("Motivo del rechazo");
  expect(screen.getByText(/Se invalidará el proceso/)).toBeInTheDocument();
  expect(within(select).getByRole("option", { name: "Cliente solicita no ser contactado" })).toBeInTheDocument();
  expect(within(select).queryByRole("option", { name: "Competencia" })).toBeNull();
});

test("perder ofrece un seguimiento opcional en tres meses", async () => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-25T15:00:00.000Z"));
  preview.mockResolvedValue({ data: { pending: pending("LOSS_REASON"), quote: null, items: 0 } });
  view("LOST", "Perdido");
  const select = await screen.findByLabelText("Motivo de la pérdida");
  expect(within(select).getByRole("option", { name: "Necesidad aplazada" })).toBeInTheDocument();
  expect(within(select).queryByRole("option", { name: "Riesgo comercial" })).toBeNull();
  expect(screen.getByRole("group", { name: "Seguimiento (opcional)" })).toBeInTheDocument();
  expect(screen.getByLabelText("Asunto del seguimiento")).not.toBeRequired();
  expect(screen.getByLabelText("Programado para")).toHaveValue("2027-01-23");
  vi.useRealTimers();
});

test("con productos y una propuesta enviada, se registran y aceptan en el mismo modal", async () => {
  preview.mockResolvedValue({
    data: { pending: pending("PROPOSAL_SENT", "ACCEPTANCE", "CLOSED_AT"), quote: { id: "q1", number: "COT-000001", status: "SENT" }, items: 2 },
  });
  complete.mockResolvedValue({ done: true });
  const user = userEvent.setup();
  view("WON", "Ganado");
  expect(await screen.findByLabelText("Vigente hasta")).toHaveAttribute("type", "date");
  await user.type(screen.getByLabelText("Evidencia de aceptación"), "Orden de compra 55");
  expect(screen.getByLabelText("Fecha real de cierre")).toHaveValue(
    new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil" }).format(new Date()),
  );
  await user.click(screen.getByRole("button", { name: "Guardar y continuar" }));
  const form = complete.mock.calls[0]?.[3] as FormData;
  expect([form.get("quoteId"), form.get("acceptanceNote")]).toEqual(["q1", "Orden de compra 55"]);
});

test("perder pide motivo y detalle; un error del API se muestra y no cierra", async () => {
  preview.mockResolvedValueOnce({ data: { pending: pending("LOSS_REASON"), quote: null, items: 0 } });
  view("LOST", "Perdido");
  expect(await screen.findByLabelText("Motivo de la pérdida")).toHaveClass("select-control");
  expect(screen.getByLabelText("Detalle")).toBeInTheDocument();

  preview.mockResolvedValueOnce({ error: "Solo un administrador puede reabrir o modificar un negocio cerrado." });
  const { onDone, onCancel } = view("REOPEN", "Abierto");
  expect(await screen.findByText(/Solo un administrador/)).toBeInTheDocument();
  await userEvent.setup().click(screen.getAllByRole("button", { name: "Cancelar" }).at(-1)!);
  expect(onCancel).toHaveBeenCalled();
  expect(onDone).not.toHaveBeenCalled();
});
