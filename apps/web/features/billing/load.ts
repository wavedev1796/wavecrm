import { unstable_rethrow } from "next/navigation";
import { FACTURACION } from "@/content/facturacion";
import { apiError, authenticatedApi } from "@/lib/authenticated-api";
import type { BillingLoad } from "./types";

/** Entrega y compradores posibles del negocio; un fallo no rompe la ficha: la tarjeta muestra el error. */
export async function loadBilling(dealId: string): Promise<BillingLoad> {
  try {
    const response = await authenticatedApi(`/deals/${encodeURIComponent(dealId)}/billing`);
    return response.ok ? ((await response.json()) as BillingLoad) : { error: await apiError(response) };
  } catch (error) {
    unstable_rethrow(error);
    return { error: FACTURACION.errorCarga };
  }
}
