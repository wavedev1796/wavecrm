import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import { createNote, deleteNote, updateNote } from "./note-actions";
import { NoteControls, NoteForm } from "./note-form";

vi.mock("./note-actions", () => ({ createNote: vi.fn(), updateNote: vi.fn(), deleteNote: vi.fn() }));
const members = [
  { id: "u2", name: "Luis" },
  { id: "u3", name: "Ana" },
];
const note = { id: "n1", content: "Primera versión", mentionIds: ["u2"] };

test("escribe una nota con menciones; si falla conserva el texto y las casillas para reintentar", async () => {
  vi.mocked(createNote)
    .mockResolvedValueOnce({ content: "Hola equipo", mentionIds: ["u3"], error: "No pudimos conectar con el servidor." })
    .mockResolvedValueOnce({ content: "", mentionIds: [], saved: true });
  const user = userEvent.setup();
  render(<NoteForm kind="contacts" id="c1" members={members} />);
  expect(screen.getByRole("group", { name: "Mencionar a" })).toHaveTextContent(/no les da acceso/);
  await user.type(screen.getByLabelText("Nota"), "Hola equipo");
  await user.click(screen.getByRole("checkbox", { name: "Ana" }));
  await user.click(screen.getByRole("button", { name: "Guardar nota" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("No pudimos conectar con el servidor.");
  expect(screen.getByLabelText("Nota")).toHaveValue("Hola equipo");
  expect(screen.getByRole("checkbox", { name: "Ana" })).toBeChecked();
  const [kind, id, , sent] = vi.mocked(createNote).mock.calls[0]!;
  expect([kind, id, sent.get("content"), sent.getAll("mentionIds")]).toEqual(["contacts", "c1", "Hola equipo", ["u3"]]);
  await user.click(screen.getByRole("button", { name: "Guardar nota" }));
  expect(await screen.findByText("Nota guardada.")).toBeInTheDocument();
  expect(screen.getByLabelText("Nota")).toHaveValue("");
});

test("el error de texto se anuncia en el campo; sin miembros no hay casillas", async () => {
  vi.mocked(createNote).mockResolvedValueOnce({ content: "", mentionIds: [], fieldErrors: { content: "Escribe la nota." } });
  const user = userEvent.setup();
  render(<NoteForm kind="deals" id="d1" members={[]} />);
  expect(screen.queryByRole("group")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Guardar nota" }));
  expect(await screen.findByText("Escribe la nota.")).toBeInTheDocument();
  expect(screen.getByLabelText("Nota")).toHaveAttribute("aria-invalid", "true");
});

test("editar parte del texto y menciones actuales; cancelar vuelve sin guardar; guardar cierra y avisa", async () => {
  vi.mocked(updateNote)
    .mockResolvedValueOnce({ content: "Corregida", mentionIds: ["u2", "u3"], error: "Nota no encontrada." })
    .mockResolvedValueOnce({ content: "Corregida", mentionIds: ["u2", "u3"], saved: true });
  const user = userEvent.setup();
  render(<NoteControls note={note} members={members} />);
  await user.click(screen.getByRole("button", { name: "Editar la nota" }));
  expect(screen.getByLabelText("Nota")).toHaveValue("Primera versión");
  expect(screen.getByRole("checkbox", { name: "Luis" })).toBeChecked();
  await user.click(screen.getByRole("button", { name: "Cancelar" }));
  expect(screen.queryByLabelText("Nota")).toBeNull();
  await user.click(screen.getByRole("button", { name: "Editar la nota" }));
  await user.clear(screen.getByLabelText("Nota"));
  await user.type(screen.getByLabelText("Nota"), "Corregida");
  await user.click(screen.getByRole("checkbox", { name: "Ana" }));
  await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Nota no encontrada.");
  expect(screen.getByLabelText("Nota")).toHaveValue("Corregida");
  expect(vi.mocked(updateNote).mock.calls[0]![0]).toBe("n1");
  await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
  expect(await screen.findByText("Nota actualizada.")).toBeInTheDocument();
  expect(screen.queryByLabelText("Nota")).toBeNull();
});

test("eliminar pide confirmación; un fallo se avisa", async () => {
  const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
  vi.mocked(deleteNote).mockResolvedValueOnce({ error: "Solo quien escribió la nota o un administrador puede cambiarla." });
  const user = userEvent.setup();
  render(<NoteControls note={note} members={members} />);
  await user.click(screen.getByRole("button", { name: "Eliminar la nota" }));
  expect(confirm).toHaveBeenCalledWith("¿Eliminar esta nota? Quedará registrado quién la eliminó.");
  expect(deleteNote).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Eliminar la nota" }));
  expect(deleteNote).toHaveBeenCalledWith("n1");
  expect(await screen.findByRole("alert")).toHaveTextContent("Solo quien escribió la nota");
});
