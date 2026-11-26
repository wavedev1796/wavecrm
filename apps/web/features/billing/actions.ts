"use server";
import { BUYER_PARTIES, PAYMENT_METHODS } from "@wave/shared";
import { FACTURACION } from "@/content/facturacion";
import { request } from "../pipeline/request";
import type { BillingResult, HandoffView } from "./types";

const base = (dealId: string, path = "") => `/deals/${encodeURIComponent(dealId)}/billing${path}`;
const text = (form: FormData, name: string) => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};
/** La respuesta de los cuatro POST es la entrega ya actualizada. */
async function call(path: string, body?: unknown): Promise<BillingResult> {
  const { error, data } = await request(path, "POST", body ?? {});
  return error ? { error } : { handoff: data as HandoffView };
}

// ponytail: el API valida de nuevo comprador y forma de pago; aquí solo se descarta lo que no es un código.
export async function sendBillingAction(dealId: string, form: FormData) {
  const buyer = text(form, "buyer");
  const paymentMethod = text(form, "paymentMethod");
  if (!(BUYER_PARTIES as readonly string[]).includes(buyer) || !(PAYMENT_METHODS as readonly string[]).includes(paymentMethod))
    return { error: FACTURACION.errorDatos };
  return call(base(dealId), { buyer, paymentMethod });
}
export async function refreshBillingAction(dealId: string) {
  return call(base(dealId, "/refresh"));
}
export async function reissueBillingAction(dealId: string, form: FormData) {
  return call(base(dealId, "/reissue"), { buyer: text(form, "buyer") });
}
export async function emailBillingAction(dealId: string, form: FormData) {
  const email = text(form, "email");
  return call(base(dealId, "/email"), email ? { email } : {});
}
