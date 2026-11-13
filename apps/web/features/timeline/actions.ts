"use server";
import { unstable_rethrow } from "next/navigation";
import { COMUN } from "@/content/comun";
import { TIMELINE } from "@/content/timeline";
import { authenticatedApi } from "@/lib/authenticated-api";
import { toEntries } from "./entries";
import type { TimelineApiPage, TimelineResult } from "./types";

const KINDS = new Set(["deals", "contacts"]);

/** Una página del historial de un negocio o contacto; sin cursor, la primera. La página la pide en el servidor y «Ver más» las siguientes. */
export async function loadTimeline(
  kind: "deals" | "contacts",
  id: string,
  cursor?: string | null,
): Promise<TimelineResult> {
  // Una acción de servidor se puede llamar con cualquier argumento: solo estas dos rutas.
  if (!KINDS.has(kind) || typeof id !== "string") return { error: TIMELINE.errorCarga };
  const query = typeof cursor === "string" && cursor ? "?" + new URLSearchParams({ cursor }).toString() : "";
  try {
    const response = await authenticatedApi(`/${kind}/${encodeURIComponent(id)}/timeline${query}`);
    // 404: el registro no existe o no es de quien mira (un VENDEDOR solo ve el historial de lo suyo).
    if (response.status === 404) return { error: TIMELINE.sinAcceso, forbidden: true };
    if (!response.ok) return { error: TIMELINE.errorCarga };
    const page = (await response.json()) as TimelineApiPage;
    return { entries: toEntries(page.data), nextCursor: page.meta.nextCursor };
  } catch (error) {
    unstable_rethrow(error);
    return { error: COMUN.errores.conexion };
  }
}
