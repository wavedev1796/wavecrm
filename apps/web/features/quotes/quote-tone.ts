import type { QuoteStatus } from "@wave/shared";

/** Color del estado de una cotización: el mismo en la ficha del negocio y en el listado. */
export const quoteTone = (status: QuoteStatus) =>
  status === "ACCEPTED" ? "success" : status === "REJECTED" ? "danger" : status === "SUPERSEDED" ? "neutral" : "blue";
