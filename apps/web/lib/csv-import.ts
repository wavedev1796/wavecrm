// Envío de un CSV al API (contactos y empresas). Sin "use server": lo usan las server actions de cada
// pantalla, que son las únicas que el cliente puede llamar; así no queda un proxy genérico al API.
import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { COMUN } from "@/content/comun";
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

export async function sendImport(
  path: string,
  formData: FormData,
  noun: { one: string; many: string },
  listPath: string,
): Promise<ImportState> {
  const file = formData.get("file");
  // Sin archivo elegido, el navegador envía un File vacío.
  if (!(file instanceof File) || !file.size)
    return failure("Adjunta un archivo Excel o CSV.");
  // Un FormData nuevo: al API solo le llegan el archivo y el mapeo, no los campos internos de Next.
  const body = new FormData();
  body.set("file", file, file.name);
  body.set("mapping", formText(formData, "mapping"));
  try {
    const response = await authenticatedApi(path, { method: "POST", body });
    if (response.status === 422) {
      const { error } = (await response.json()) as {
        error: { message: string; errors: RowError[] };
      };
      return failure(error.message, error.errors);
    }
    if (!response.ok) return failure(await apiError(response));
    const { imported } = (await response.json()) as { imported: number };
    revalidatePath(listPath);
    const message =
      imported === 1
        ? `Se importó 1 ${noun.one}.`
        : `Se importaron ${imported} ${noun.many}.`;
    return { tone: "success", message, errors: [] };
  } catch (error) {
    // Una sesión vencida redirige al login desde authenticatedApi: no es un error de conexión.
    unstable_rethrow(error);
    return failure(COMUN.errores.conexion);
  }
}
