"use server";
import { cleanText } from "@wave/shared";
import { request } from "../pipeline/request";
import { taxRateError } from "./tax-rate";

export async function saveSettingsAction(
  _state: { error?: string; saved?: boolean },
  form: FormData,
): Promise<{ error?: string; saved?: boolean }> {
  const text = cleanText(String(form.get("taxRate") ?? ""));
  const invalid = taxRateError(text);
  if (invalid) return { error: invalid };
  const { error } = await request("/settings", "PATCH", { taxRate: Number(text) });
  return error ? { error } : { saved: true };
}
