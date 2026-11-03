import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { ActivitiesToastHost, Agenda, NewActivityForm, type AgendaActivity } from "./agenda";
import { saveActivity } from "./actions";

const { refresh, fetchMock } = vi.hoisted(() => ({ refresh: vi.fn(), fetchMock: vi.fn() }));
beforeEach(() => {
  refresh.mockClear();
  fetchMock.mockReset();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  vi.stubGlobal("fetch", fetchMock);
});
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, push: vi.fn() }),
}));
vi.mock("./actions", () => ({
  saveActivity: vi.fn(),
  saveActivityForm: vi.fn(),
}));

const activity: AgendaActivity = {
  id: "a1",
  updatedAt: "2026-10-29T12:00:00.000Z",
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
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
    "/api/activities/a1/complete",
    { method: "PATCH" },
  ));
  await waitFor(() => expect(refresh).toHaveBeenCalled());
});

test("la agenda filtra atrasadas y cambia a calendario", async () => {
  render(<Agenda activities={[activity]} owners={[{ id: "u1", name: "Ana Vendedor" }]} />);
  await userEvent.selectOptions(
    screen.getByLabelText("Filtrar por fecha"),
    "overdue",
  );
  expect(screen.getByText("Atrasada")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Calendario" }));
  expect(screen.getByRole("grid")).toBeInTheDocument();
});

test("cancelar confirma, usa la acción del servidor y refresca la agenda", async () => {
  vi.stubGlobal("confirm", vi.fn(() => true));
  render(<Agenda activities={[activity]} owners={[]} />);
  await userEvent.click(screen.getByRole("button", { name: "Cancelar Llamar a Ana" }));
  expect(window.confirm).toHaveBeenCalledWith("¿Cancelar esta actividad? Quedará en el historial.");
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
    "/api/activities/a1/cancel",
    { method: "PATCH" },
  ));
  await waitFor(() => expect(refresh).toHaveBeenCalled());
});

test("un error al cancelar se muestra en el aviso", async () => {
  fetchMock.mockResolvedValue({
    ok: false,
    json: async () => ({ error: { message: "La actividad ya no está pendiente." } }),
  });
  vi.stubGlobal("confirm", vi.fn(() => true));
  render(<><ActivitiesToastHost /><Agenda activities={[activity]} owners={[]} /></>);
  await userEvent.click(screen.getByRole("button", { name: "Cancelar Llamar a Ana" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("La actividad ya no está pendiente.");
  expect(refresh).not.toHaveBeenCalled();
});

test("un conflicto al editar cierra el diálogo y refresca la versión reciente", async () => {
  vi.mocked(saveActivity).mockResolvedValue({ ok: false, message: "La actividad cambió.", conflict: true });
  render(<Agenda activities={[activity]} owners={[{ id: "u1", name: "Ana Vendedor" }]} />);
  await userEvent.click(screen.getByRole("button", { name: "Editar Llamar a Ana" }));
  await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(refresh).toHaveBeenCalled();
});

test("edición y eliminación llaman las acciones del servidor", async () => {
  vi.mocked(saveActivity).mockResolvedValue({ ok: true, message: "Actualizada" });
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
  await userEvent.click(screen.getByRole("button", { name: "Editar Llamar a Ana" }));
  expect(screen.getByRole("dialog", { name: "Editar actividad" })).toBeInTheDocument();
  expect(screen.getByDisplayValue("Llamar a Ana")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
  expect(saveActivity).toHaveBeenCalled();
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(refresh).toHaveBeenCalled();
  await userEvent.click(
    screen.getByRole("button", { name: "Eliminar Llamar a Ana" }),
  );
  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
    "/api/activities/a1/delete",
    { method: "DELETE" },
  ));
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
