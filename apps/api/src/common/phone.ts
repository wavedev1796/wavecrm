import { parsePhoneNumberFromString, type CountryCode } from 'libphonenumber-js';

// Teléfonos de cualquier país (ajustes del Sprint 2). Copia exacta en apps/web/lib/phone.ts;
// ambos lados se prueban con test/casos-de-validacion.json.

export const PHONE_INVALID = 'Escribe un teléfono válido, por ejemplo 0991234567 o +57 601 234 5678.';

/** E.164 (`+593991234567`). Sin `+`, el número es del país indicado (Ecuador por defecto). `null` si no es válido. */
export function normalizePhone(value: string, country: CountryCode = 'EC') {
  const phone = parsePhoneNumberFromString(value, country);
  return phone?.isValid() ? phone.number : null;
}
