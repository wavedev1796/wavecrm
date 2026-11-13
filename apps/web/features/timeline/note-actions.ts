"use server";
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { cleanText } from "@wave/shared";
import { COMUN } from "@/content/comun";
import { TIMELINE } from "@/content/timeline";
import { apiError, authenticatedApi } from "@/lib/authenticated-api";
import type { NoteFormState } from "./types";

const texto = TIMELINE.notas;
const KINDS = new Set(["deals", "contacts"]);

/** Texto limpio (conserva saltos de línea) y menciones marcadas; lo que no sea texto se ignora. */
function read(form: FormData) {
  const raw = form.get("content");
  return {
    content: typeof raw === "string" ? cleanText(raw, true) : "",
    mentionIds: form.getAll("mentionIds").filter((value): value is string => typeof value === "string"),
  };
}
function contentError(content: string) {
  if (!content) return texto.textoRequerido;
  return content.length > 5000 ? texto.textoLargo : undefined;
}

/** null si salió bien; si no, el mensaje del API o de conexión. Al guardar se vuelven a pedir las fichas. */
async function send(path: string, method: string, body?: unknown): Promise<string | null> {
  try {
    const response = await authenticatedApi(path, {
      method,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    if (!response.ok) return await apiError(response);
    for (const page of ["/pipeline", "/contactos"]) revalidatePath(page, "layout");
    return null;
  } catch (error) {
    unstable_rethrow(error);
    return COMUN.errores.conexion;
  }
}

// Un fallo devuelve lo escrito: el formulario lo conserva para reintentar.

export async function createNote(
  kind: "deals" | "contacts",
  id: string,
  _state: NoteFormState,
  form: FormData,
): Promise<NoteFormState> {
  const values = read(form);
  // Una acción de servidor se puede llamar con cualquier argumento: solo estas dos rutas.
  if (!KINDS.has(kind) || typeof id !== "string") return { ...values, error: COMUN.errores.operacion };
  const content = contentError(values.content);
  if (content) return { ...values, fieldErrors: { content } };
  const error = await send(`/${kind}/${encodeURIComponent(id)}/notes`, "POST", values);
  return error ? { ...values, error } : { content: "", mentionIds: [], saved: true };
}

export async function updateNote(noteId: string, _state: NoteFormState, form: FormData): Promise<NoteFormState> {
  const values = read(form);
  const content = contentError(values.content);
  if (content) return { ...values, fieldErrors: { content } };
  const error = await send(`/notes/${encodeURIComponent(noteId)}`, "PATCH", values);
  return error ? { ...values, error } : { ...values, saved: true };
}

export async function deleteNote(noteId: string): Promise<{ error?: string }> {
  const error = await send(`/notes/${encodeURIComponent(noteId)}`, "DELETE");
  return error ? { error } : {};
}
