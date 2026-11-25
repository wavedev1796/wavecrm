import { revalidatePath } from "next/cache";
import { unstable_rethrow } from "next/navigation";
import { apiError, authenticatedApi } from "@/lib/authenticated-api";
import { PIPELINE } from "@/content/pipeline";
import type { Pending } from "./types";

// Sin "use server": todo export de un archivo "use server" es una acción que el navegador puede invocar (R2).
function refresh() {
  // /actividades: las actividades del negocio (ficha y modal de transición) son las mismas de la agenda (P14).
  for (const path of ["/pipeline", "/contactos", "/empresas", "/actividades", "/cotizaciones"])
    revalidatePath(path, "layout");
}
export async function request(
  path: string,
  method: string,
  body?: unknown,
): Promise<{ error?: string; status?: number; data?: unknown; pending?: Pending[] }> {
  try {
    const response = await authenticatedApi(path, {
      method,
      ...(body !== undefined && { body: JSON.stringify(body) }),
    });
    if (!response.ok) {
      // Un 422 de una transición trae la lista de pendientes junto al mensaje.
      const body = (await response
        .clone()
        .json()
        .catch(() => null)) as { error?: { errors?: unknown } } | null;
      const pending = body?.error?.errors;
      return {
        error: await apiError(response),
        status: response.status,
        ...(Array.isArray(pending) && { pending: pending as Pending[] }),
      };
    }
    const data: unknown =
      response.status === 204
        ? undefined
        : await response.json().catch(() => undefined);
    if (method !== "GET") refresh();
    return { data };
  } catch (error) {
    unstable_rethrow(error);
    return { error: PIPELINE.connection };
  }
}
