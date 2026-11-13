// Fechas del formulario de actividad (agenda y ficha del negocio). Ecuador continental está en UTC-5 todo el año.

/** Valor de un `datetime-local` («2026-11-05T15:00») como instante ISO de Ecuador, o undefined si no es válido. */
export function ecuadorIso(value: FormDataEntryValue | null) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}:00-05:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

/** Instante del API como valor de un `datetime-local` en hora de Ecuador. */
export function inputDate(value?: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(value))
    .replace(" ", "T");
}
