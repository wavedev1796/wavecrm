import { TAX_CODES } from "@wave/shared";
import { CONFIGURACION } from "@/content/configuracion";

/** IVA general: entero de 0 a 100 que Wave Billing acepte (tiene código), igual que valida el API. Devuelve el error, o undefined. */
export function taxRateError(text: string) {
  if (!/^\d{1,3}$/.test(text) || Number(text) > 100) return CONFIGURACION.iva.error;
  return Number(text) in TAX_CODES ? undefined : CONFIGURACION.iva.sinCodigo;
}
