import { PIPELINE } from "@/content/pipeline";
import type { Pending, Preview } from "./types";

type Result = { error?: string; status?: number; data?: Preview; pending?: Pending[] };

/** Lee los requisitos de transición por HTTP para que un fallo de red aparezca en el modal. */
export async function previewTransition(dealId: string, to: string): Promise<Result> {
  try {
    const response = await fetch(
      `/api/pipeline/deals/${encodeURIComponent(dealId)}/transition?to=${encodeURIComponent(to)}`,
      { cache: "no-store" },
    );
    const result = (await response.json().catch(() => null)) as Result | null;
    if (!result) return { error: PIPELINE.connection, status: response.status };
    return result;
  } catch {
    return { error: PIPELINE.connection };
  }
}
