import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { entry } from "../timeline/timeline-fixture";
import { createActivityAction } from "./actions";
import { baseDeal } from "./deal-fixture";
import { DealTimeline } from "./deal-timeline";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
vi.mock("./actions", () => ({ createActivityAction: vi.fn(), completeActivityAction: vi.fn() }));
vi.mock("../timeline/actions", () => ({ loadTimeline: vi.fn() }));
vi.mock("../timeline/note-actions", () => ({ createNote: vi.fn(), updateNote: vi.fn(), deleteNote: vi.fn() }));
const members = [
  { id: "u1", name: "Zaith" },
  { id: "u2", name: "Luis" },
];
const create = vi.mocked(createActivityAction);

test("muestra la actividad, la nota y el historial con sus pendientes, y enlaza a la agenda del negocio", () => {
  render(
    <DealTimeline
      deal={baseDeal}
      members={members}
      timeline={{ entries: [entry("ACTIVITY:a1", { title: "Llamar a Maria", pending: { id: "a1", subject: "Llamar a Maria" } })], nextCursor: null }}
    />,
  );
  expect(screen.getByRole("button", { name: "Registrar actividad" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Ver en la agenda" })).toHaveAttribute("href", "/actividades?dealId=d1");
  expect(screen.getByRole("heading", { name: "Nueva nota" })).toBeInTheDocument();
  expect(screen.getByRole("checkbox", { name: "Luis" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Completar Llamar a Maria" })).toBeInTheDocument();
});

test("registrar abre el diálogo de la agenda con el responsable del negocio y la casilla de hecha", async () => {
  create.mockResolvedValueOnce({ ok: false, message: "El responsable debe ser un usuario activo." });
  create.mockResolvedValueOnce({ ok: true, message: "Actividad registrada." });
  const user = userEvent.setup();
  render(<DealTimeline deal={baseDeal} members={members} timeline={{ entries: [], nextCursor: null }} />);
  await user.click(screen.getByRole("button", { name: "Registrar actividad" }));
  const dialog = screen.getByRole("dialog", { name: "Registrar actividad" });
  expect(within(dialog).getByLabelText("Responsable asignado")).toHaveValue("u1");
  expect(within(dialog).getByLabelText("Recordatorio por correo")).toBeInTheDocument();
  expect(within(dialog).getByRole("checkbox", { name: "Ya se realizó" })).toBeInTheDocument();
  await user.type(within(dialog).getByRole("textbox", { name: "Asunto" }), "Enviar propuesta");
  // Un error del API se ve dentro del diálogo y no borra lo escrito.
  await user.click(within(dialog).getByRole("button", { name: "Guardar actividad" }));
  expect(await within(dialog).findByRole("alert")).toHaveTextContent("El responsable debe ser un usuario activo.");
  expect(within(dialog).getByRole("textbox", { name: "Asunto" })).toHaveValue("Enviar propuesta");
  await user.click(within(dialog).getByRole("button", { name: "Guardar actividad" }));
  expect(await screen.findByText("Actividad registrada.")).toBeInTheDocument();
  expect(screen.queryByRole("dialog")).toBeNull();
  const [dealId, form] = create.mock.calls[1]!;
  expect([dealId, form.get("subject"), form.get("assigneeId")]).toEqual(["d1", "Enviar propuesta", "u1"]);
  expect(refresh).toHaveBeenCalled();
});

test("sin acceso al historial se puede registrar; un rechazado no admite actividades pero sí notas y su agenda", () => {
  const forbidden = { error: "No tienes acceso al historial de este registro.", forbidden: true as const };
  const { rerender } = render(<DealTimeline deal={baseDeal} members={members} timeline={forbidden} />);
  expect(screen.getByText("No tienes acceso al historial de este registro.")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Registrar actividad" })).toBeInTheDocument();
  rerender(
    <DealTimeline deal={{ ...baseDeal, status: "REJECTED" }} members={members} timeline={{ entries: [], nextCursor: null }} />,
  );
  expect(screen.queryByRole("button", { name: "Registrar actividad" })).toBeNull();
  expect(screen.getByRole("link", { name: "Ver en la agenda" })).toBeInTheDocument();
  expect(screen.getByLabelText("Nota")).toBeInTheDocument();
  expect(screen.getByText("Todavía no hay actividad registrada.")).toBeInTheDocument();
});
