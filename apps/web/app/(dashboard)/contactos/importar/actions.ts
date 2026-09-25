"use server";

import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { apiError, authenticatedApi } from "@/lib/authenticated-api";
import { formText } from "@/lib/validation";

export type RowError = { row: number; column: string; message: string };
export type ImportState = {
  tone: "success" | "error";
  message: string;
  errors: RowError[];
} | null;

const failure = (message: string, errors: RowError[] = []): ImportState => ({
  tone: "error",
  message,
  errors,
});

export async function importContacts(
  _state: ImportState,
  formData: FormData,
): Promise<ImportState> {
  const file = formData.get("file");
  // Sin archivo elegido, el navegador envía un File vacío.
  if (!(file instanceof File) || !file.size)
    return failure("Adjunta un archivo CSV.");
  // Un FormData nuevo: al API solo le llegan el archivo y el mapeo, no los campos internos de Next.
  const body = new FormData();
  body.set("file", file, file.name);
  body.set("mapping", formText(formData, "mapping"));
  try {
    const response = await authenticatedApi("/contacts/import", {
      method: "POST",
      body,
    });
    if (response.status === 422) {
      const { error } = (await response.json()) as {
        error: { message: string; errors: RowError[] };
      };
      return failure(error.message, error.errors);
    }
    if (!response.ok) return failure(await apiError(response));
    const { imported } = (await response.json()) as { imported: number };
    revalidatePath("/contactos");
    const message =
      imported === 1
        ? "Se importó 1 contacto."
        : `Se importaron ${imported} contactos.`;
    return { tone: "success", message, errors: [] };
  } catch (error) {
    // Una sesión vencida redirige al login desde authenticatedApi: no es un error de conexión.
    unstable_rethrow(error);
    return failure("No pudimos conectar con el servidor. Inténtalo de nuevo.");
  }
}
