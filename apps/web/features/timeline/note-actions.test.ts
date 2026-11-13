import { revalidatePath } from "next/cache";
import { expect, test, vi } from "vitest";
import { authenticatedApi } from "@/lib/authenticated-api";
import { createNote, deleteNote, updateNote } from "./note-actions";

vi.mock("@/lib/authenticated-api", () => ({
  authenticatedApi: vi.fn(),
  // Como el real: el mensaje del cuerpo `{ error: { message } }`.
  apiError: async (response: Response) =>
    ((await response.json()) as { error: { message: string } }).error.message,
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));
const api = vi.mocked(authenticatedApi);
const EMPTY = { content: "", mentionIds: [] };

function form(content: string | File, mentionIds: string[] = []) {
  const data = new FormData();
  data.set("content", content);
  for (const id of mentionIds) data.append("mentionIds", id);
  return data;
}

test("crea la nota limpia, con sus menciones, y vuelve a pedir las fichas", async () => {
  api.mockResolvedValueOnce(Response.json({ id: "n1" }, { status: 201 }));
  const result = await createNote("deals", "d 1", EMPTY, form("  Llamar\r\n\r\n\r\nel lunes ", ["u2", "u3"]));
  expect(api).toHaveBeenCalledWith("/deals/d%201/notes", {
    method: "POST",
    body: JSON.stringify({ content: "Llamar\n\nel lunes", mentionIds: ["u2", "u3"] }),
  });
  expect(result).toEqual({ content: "", mentionIds: [], saved: true });
  expect(revalidatePath).toHaveBeenCalledWith("/contactos", "layout");
});

test("texto vacío, demasiado largo o que no es texto no llega al API y conserva las menciones", async () => {
  expect(await createNote("contacts", "c1", EMPTY, form("   ", ["u2"]))).toEqual({
    content: "",
    mentionIds: ["u2"],
    fieldErrors: { content: "Escribe la nota." },
  });
  expect(await createNote("contacts", "c1", EMPTY, form(new File(["x"], "a.txt")))).toMatchObject({
    fieldErrors: { content: "Escribe la nota." },
  });
  expect(await updateNote("n1", EMPTY, form("x".repeat(5001)))).toMatchObject({
    fieldErrors: { content: "La nota admite hasta 5000 caracteres." },
  });
  expect(await createNote("users" as never, "u1", EMPTY, form("Hola"))).toMatchObject({
    content: "Hola",
    error: "No pudimos completar la operación.",
  });
  expect(api).not.toHaveBeenCalled();
});

test("un fallo del API o de conexión devuelve lo escrito para reintentar", async () => {
  api.mockResolvedValueOnce(
    Response.json({ error: { message: "Solo puedes mencionar a miembros activos del equipo." } }, { status: 400 }),
  );
  expect(await createNote("contacts", "c1", EMPTY, form("Hola", ["baja"]))).toEqual({
    content: "Hola",
    mentionIds: ["baja"],
    error: "Solo puedes mencionar a miembros activos del equipo.",
  });
  api.mockRejectedValueOnce(new Error("fetch failed"));
  expect(await updateNote("n1", EMPTY, form("Corregida"))).toEqual({
    content: "Corregida",
    mentionIds: [],
    error: "No pudimos conectar con el servidor. Inténtalo de nuevo.",
  });
  expect(revalidatePath).not.toHaveBeenCalled();
});

test("editar y eliminar usan la ruta de la nota", async () => {
  api.mockResolvedValueOnce(Response.json({ id: "n/1" }));
  expect(await updateNote("n/1", EMPTY, form("Nueva", ["u2"]))).toEqual({
    content: "Nueva",
    mentionIds: ["u2"],
    saved: true,
  });
  expect(api).toHaveBeenLastCalledWith("/notes/n%2F1", {
    method: "PATCH",
    body: JSON.stringify({ content: "Nueva", mentionIds: ["u2"] }),
  });
  api.mockResolvedValueOnce(new Response(null, { status: 204 }));
  expect(await deleteNote("n1")).toEqual({});
  expect(api).toHaveBeenLastCalledWith("/notes/n1", { method: "DELETE" });
  api.mockResolvedValueOnce(
    Response.json({ error: { message: "Solo quien escribió la nota o un administrador puede cambiarla." } }, { status: 403 }),
  );
  expect(await deleteNote("n1")).toEqual({
    error: "Solo quien escribió la nota o un administrador puede cambiarla.",
  });
});
