// Formatos de pantalla en es-EC (CRM-19): una sola copia para toda la web.
const LOCALE = "es-EC";

/** Hasta dos iniciales en mayúscula: "Ana López" → "AL". Sin nombre devuelve "". */
export function initials(name = "") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export const formatMoney = (value: string | number, currency = "USD") =>
  new Intl.NumberFormat(LOCALE, { style: "currency", currency }).format(
    Number(value),
  );

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium" }).format(
    new Date(value),
  );

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
