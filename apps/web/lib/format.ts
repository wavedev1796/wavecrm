// Formatos de pantalla en es-EC: una sola copia para toda la web.
const LOCALE = "es-EC";
// Render corre en UTC y los navegadores en su zona: sin zona fija el servidor y el cliente pintan horas distintas.
const TIME_ZONE = "America/Guayaquil";

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
  new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeZone: TIME_ZONE }).format(
    new Date(value),
  );

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(LOCALE, {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: TIME_ZONE,
  }).format(new Date(value));

/** Día de calendario guardado a las 00:00 UTC (cierre estimado, fecha de ganado): se muestra sin correr de zona. */
export const formatDay = (value: string) =>
  new Intl.DateTimeFormat(LOCALE, { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(value),
  );
