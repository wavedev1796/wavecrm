import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { completeActivityAction } from "../pipeline/actions";
import { loadTimeline } from "./actions";
import { entry } from "./timeline-fixture";
import { TimelineList } from "./timeline-list";

vi.mock("./actions", () => ({ loadTimeline: vi.fn() }));
vi.mock("../pipeline/actions", () => ({ createActivityAction: vi.fn(), completeActivityAction: vi.fn() }));
vi.mock("./note-actions", () => ({ createNote: vi.fn(), updateNote: vi.fn(), deleteNote: vi.fn() }));
const load = vi.mocked(loadTimeline);
const items = () => screen.getAllByRole("listitem").map((li) => li.textContent);

test("pinta cada evento con su tipo, título, autor y fecha en el orden recibido", () => {
  render(
    <TimelineList
      kind="deals"
      id="d1"
      initial={{
        entries: [
          entry("NOTE:n1", { type: "Nota", title: "Nota registrada", detail: "Zaith · 3 oct 2026, 7:00" }),
          entry("STAGE:h1", { type: "Cambio de etapa", title: "Creado en Propuesta", detail: "Eduardo · 1 oct 2026, 10:00" }),
        ],
        nextCursor: null,
      }}
    />,
  );
  expect(items()).toEqual([
    "NotaNota registradaZaith · 3 oct 2026, 7:00",
    "Cambio de etapaCreado en PropuestaEduardo · 1 oct 2026, 10:00",
  ]);
  expect(screen.getByRole("list")).toHaveAttribute("aria-live", "polite");
  expect(screen.queryByRole("button", { name: "Ver más" })).toBeNull();
});

test("la ficha limita el historial visible a cinco registros y abre el resto en un diálogo", async () => {
  const user = userEvent.setup();
  render(
    <TimelineList
      kind="contacts"
      id="c1"
      initial={{ entries: Array.from({ length: 8 }, (_, index) => entry(`log-${index}`)), nextCursor: null }}
    />,
  );
  expect(screen.getAllByRole("listitem")).toHaveLength(5);
  await user.click(screen.getByRole("button", { name: "Abrir historial completo" }));
  const dialog = screen.getByRole("dialog", { name: "Historial completo" });
  expect(within(dialog).getAllByRole("listitem")).toHaveLength(8);
});

test("«Ver más» agrega la página siguiente sin repetir eventos y se oculta al final", async () => {
  let finish!: (value: Awaited<ReturnType<typeof loadTimeline>>) => void;
  load.mockReturnValueOnce(new Promise((resolve) => (finish = resolve)));
  const user = userEvent.setup();
  render(<TimelineList kind="contacts" id="c1" initial={{ entries: [entry("a"), entry("b")], nextCursor: "k1" }} fullHistory />);
  await user.click(screen.getByRole("button", { name: "Ver más" }));
  expect(load).toHaveBeenCalledWith("contacts", "c1", "k1");
  expect(screen.getByRole("button", { name: "Ver más" })).toBeDisabled();
  expect(screen.getByRole("list")).toHaveAttribute("aria-busy", "true");
  finish({ entries: [entry("b"), entry("c")], nextCursor: null });
  expect(await screen.findByText("Título c")).toBeInTheDocument();
  expect(items()).toHaveLength(3);
  expect(screen.queryByRole("button", { name: "Ver más" })).toBeNull();
});

test("si falla la carga conserva lo cargado, avisa y permite reintentar", async () => {
  load
    .mockResolvedValueOnce({ error: "No pudimos cargar el historial." })
    .mockRejectedValueOnce(new Error("red"))
    .mockResolvedValueOnce({ entries: [entry("b")], nextCursor: "k2" });
  const user = userEvent.setup();
  render(<TimelineList kind="contacts" id="c1" initial={{ entries: [entry("a")], nextCursor: "k1" }} fullHistory />);
  await user.click(screen.getByRole("button", { name: "Ver más" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos cargar el historial.");
  expect(items()).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos conectar con el servidor.");
  await user.click(screen.getByRole("button", { name: "Reintentar" }));
  expect(await screen.findByText("Título b")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(load).toHaveBeenLastCalledWith("contacts", "c1", "k1");
  expect(screen.getByRole("button", { name: "Ver más" })).toBeEnabled();
});

test("en el contacto, los eventos de un negocio lo enlazan; el negocio eliminado y lo del contacto no", () => {
  render(
    <TimelineList
      kind="contacts"
      id="c1"
      initial={{
        entries: [
          entry("EVENT:x", { title: "Negocio «Cuenta vieja» eliminado", note: "Motivo: Duplicado" }),
          entry("ACTIVITY:a1", { title: "Llamar", deal: { id: "d1", title: "Cuenta Andina" }, pending: { id: "a1", subject: "Llamar" } }),
          entry("NOTE:n1", { note: "<script>alert(1)</script>" }),
        ],
        nextCursor: null,
      }}
    />,
  );
  expect(screen.getAllByRole("link")).toHaveLength(1);
  expect(screen.getByRole("link", { name: "Cuenta Andina" })).toHaveAttribute("href", "/pipeline/d1");
  expect(screen.getByText("Motivo: Duplicado")).toBeInTheDocument();
  // La nota es texto: la etiqueta se ve tal cual y no crea un <script>.
  expect(screen.getByText("<script>alert(1)</script>")).toBeInTheDocument();
  expect(document.querySelector("script")).toBeNull();
  // Completar es de la ficha del negocio.
  expect(screen.queryByRole("button", { name: /Completar/ })).toBeNull();
});

test("pinta los cambios de auditoría de una actividad como eventos del historial", () => {
  render(
    <TimelineList
      kind="contacts"
      id="c1"
      initial={{
        entries: [entry("EVENT:activity-1", {
          type: "Cambio en actividad",
          title: "Actividad cancelada: Llamar al cliente",
          detail: "Eduardo · 3 nov 2026, 10:00",
          note: "Estado: Pendiente → Cancelada",
        })],
        nextCursor: null,
      }}
    />,
  );
  expect(screen.getByText("Actividad cancelada: Llamar al cliente")).toBeInTheDocument();
  expect(screen.getByText("Estado: Pendiente → Cancelada")).toBeInTheDocument();
});

test("en el negocio, las pendientes se completan aquí y no enlazan al propio negocio", async () => {
  vi.mocked(completeActivityAction).mockResolvedValue({ data: {} });
  const user = userEvent.setup();
  render(
    <TimelineList
      kind="deals"
      id="d1"
      initial={{
        entries: [entry("ACTIVITY:a1", { title: "Llamar", deal: { id: "d1", title: "Cuenta Andina" }, pending: { id: "a1", subject: "Llamar" } })],
        nextCursor: null,
      }}
    />,
  );
  expect(screen.queryByRole("link")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Completar Llamar" }));
  expect(completeActivityAction).toHaveBeenCalledWith("d1", "a1");
});

test("CRM-26: solo las notas editables muestran editar y eliminar, con los miembros para mencionar", async () => {
  const user = userEvent.setup();
  render(
    <TimelineList
      kind="contacts"
      id="c1"
      members={[{ id: "u2", name: "Luis" }]}
      initial={{
        entries: [
          entry("NOTE:n1", { note: "Mía", editable: { id: "n1", content: "Mía", mentionIds: [] } }),
          entry("NOTE:n2", { note: "De otro" }),
        ],
        nextCursor: null,
      }}
    />,
  );
  expect(screen.getAllByRole("button", { name: "Editar la nota" })).toHaveLength(1);
  expect(screen.getAllByRole("button", { name: "Eliminar la nota" })).toHaveLength(1);
  await user.click(screen.getByRole("button", { name: "Editar la nota" }));
  expect(screen.getByRole("checkbox", { name: "Luis" })).not.toBeChecked();
});

test("sin acceso muestra el aviso; con otro error, la alerta; vacío, el mensaje de vacío", () => {
  const { rerender } = render(
    <TimelineList kind="deals" id="d1" initial={{ error: "No tienes acceso al historial de este registro.", forbidden: true }} />,
  );
  expect(screen.getByText("No tienes acceso al historial de este registro.")).toBeInTheDocument();
  expect(screen.queryByRole("alert")).toBeNull();
  expect(screen.queryByRole("list")).toBeNull();
  rerender(<TimelineList kind="deals" id="d1" initial={{ error: "No pudimos cargar el historial." }} />);
  expect(screen.getByRole("alert")).toHaveTextContent("No pudimos cargar el historial.");
  rerender(<TimelineList kind="deals" id="d1" initial={{ entries: [], nextCursor: null }} />);
  expect(screen.getByText("Todavía no hay actividad registrada.")).toBeInTheDocument();
});

test("al revalidar, la nueva primera página reemplaza lo cargado y una respuesta tardía se ignora", async () => {
  let finish!: (value: Awaited<ReturnType<typeof loadTimeline>>) => void;
  load
    .mockResolvedValueOnce({ entries: [entry("b")], nextCursor: "k2" })
    .mockReturnValueOnce(new Promise((resolve) => (finish = resolve)))
    .mockResolvedValueOnce({ entries: [entry("z")], nextCursor: null });
  const user = userEvent.setup();
  const { rerender } = render(<TimelineList kind="deals" id="d1" initial={{ entries: [entry("a")], nextCursor: "k1" }} fullHistory />);
  await user.click(screen.getByRole("button", { name: "Ver más" }));
  expect(await screen.findByText("Título b")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Ver más" }));
  rerender(<TimelineList kind="deals" id="d1" initial={{ entries: [entry("n"), entry("a")], nextCursor: "k9" }} fullHistory />);
  expect(items()).toHaveLength(2);
  finish({ entries: [entry("tarde")], nextCursor: null });
  await vi.waitFor(() => expect(screen.getByRole("button", { name: "Ver más" })).toBeEnabled());
  expect(screen.queryByText("Título tarde")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Ver más" }));
  expect(await screen.findByText("Título z")).toBeInTheDocument();
  expect(screen.queryByText("Título tarde")).toBeNull();
  expect(load).toHaveBeenLastCalledWith("deals", "d1", "k9");
});
