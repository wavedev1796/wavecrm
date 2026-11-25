"use server";
import { cleanText } from "@wave/shared";
import { CONFIGURACION } from "@/content/configuracion";
import { request } from "../pipeline/request";
import { isTaxRate } from "./tax-rate";

export async function saveSettingsAction(
  _state: { error?: string; saved?: boolean },
  form: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const text = cleanText(String(form.get("taxRate") ?? ""));
  if (!isTaxRate(text)) return { error: CONFIGURACION.iva.error };
  const { error } = await request("/settings", "PATCH", { taxRate: Number(text) });
  return error ? { error } : { saved: true };
}
