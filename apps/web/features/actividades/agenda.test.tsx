import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { ActivitiesToastHost, Agenda, NewActivityForm, type AgendaActivity } from "./agenda";
import { completeActivity, deleteActivity, saveActivity } from "./actions";

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
}));
vi.mock("./actions", () => ({
  completeActivity: vi.fn(),
  deleteActivity: vi.fn(),
  saveActivity: vi.fn(),
  saveActivityForm: vi.fn(),
}));

const activity: AgendaActivity = {
  id: "a1",
  type: "CALL",
  status: "PENDING",
  subject: "Llamar a Ana",
  description: "Confirmar propuesta",
  dueAt: "2026-10-30T15:00:00.000Z",
  reminderAt: null,
  assigneeId: "u1",
  assignee: { id: "u1", name: "Ana Vendedor", email: "ana@example.test" },
  contact: { id: "c1", firstName: "Ana", lastName: "López" },
  company: null,
  deal: null,
};

test("la agenda lista actividades con responsable, contexto y marca como hecha", async () => {
  vi.mocked(completeActivity).mockResolvedValue({ ok: true, message: "Hecha" });
  render(
    <Agenda
      activities={[activity]}
      owners={[{ id: "u1", name: "Ana Vendedor" }]}
    />,
  );
  expect(
    screen.getByRole("heading", { name: "Llamar a Ana" }),
  ).toBeInTheDocument();
  expect(screen.getByText(/Ana Vendedor · Ana López/)).toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: "Marcar Llamar a Ana como hecha" }),
  );
  expect(completeActivity).toHaveBeenCalledWith("a1");
  expect(refresh).toHaveBeenCalled();
});

test("la agenda filtra atrasadas y cambia a calendario", async () => {
  render(<Agenda activities={[activity]} owners={[]} />);
  await userEvent.selectOptions(
    screen.getByLabelText("Filtrar por fecha"),
    "overdue",
  );
  expect(screen.getByText("Atrasada")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Calendario" }));
  expect(screen.getByRole("grid")).toBeInTheDocument();
});

test("edición y eliminación llaman las acciones del servidor", async () => {
  vi.mocked(deleteActivity).mockResolvedValue({
    ok: true,
    message: "Eliminada",
  });
  vi.stubGlobal(
    "confirm",
    vi.fn(() => true),
  );
  render(
    <Agenda
      activities={[activity]}
      owners={[{ id: "u1", name: "Ana Vendedor" }]}
    />,
  );
  fireEvent.click(screen.getByLabelText("Editar Llamar a Ana"));
  expect(screen.getByDisplayValue("Llamar a Ana")).toBeInTheDocument();
  await userEvent.click(
    screen.getByRole("button", { name: "Eliminar Llamar a Ana" }),
  );
  expect(deleteActivity).toHaveBeenCalledWith("a1");
});

test("el calendario avanza y retrocede entre meses", async () => {
  render(<Agenda activities={[activity]} owners={[]} initialView="calendar" />);
  const month = screen.getByRole("heading", { level: 2 });
  const initial = month.textContent;
  await userEvent.click(screen.getByRole("button", { name: "Mes siguiente" }));
  expect(month.textContent).not.toBe(initial);
  await userEvent.click(screen.getByRole("button", { name: "Mes anterior" }));
  expect(month.textContent).toBe(initial);
});

test("el alta confirma con toast verde y cierra el diálogo", async () => {
  vi.mocked(saveActivity).mockResolvedValue({ ok: true, message: "Actividad creada." });
  render(<><ActivitiesToastHost /><NewActivityForm owners={[{ id: "u1", name: "Ana Vendedor" }]} /></>);
  await userEvent.click(screen.getByRole("button", { name: "Nueva actividad" }));
  await userEvent.type(screen.getByRole("textbox", { name: "Asunto" }), "Enviar propuesta");
  await userEvent.click(screen.getByRole("button", { name: "Guardar actividad" }));
  expect(await screen.findByRole("status")).toHaveTextContent("Actividad creada.");
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(refresh).toHaveBeenCalled();
});

test("el alta informa fallos con un toast rojo", async () => {
  vi.mocked(saveActivity).mockResolvedValue({ ok: false, message: "No se pudo guardar." });
  render(<><ActivitiesToastHost /><NewActivityForm owners={[{ id: "u1", name: "Ana Vendedor" }]} /></>);
  await userEvent.click(screen.getByRole("button", { name: "Nueva actividad" }));
  await userEvent.type(screen.getByRole("textbox", { name: "Asunto" }), "Enviar propuesta");
  await userEvent.click(screen.getByRole("button", { name: "Guardar actividad" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar.");
  expect(screen.getByRole("dialog")).toBeInTheDocument();
});
