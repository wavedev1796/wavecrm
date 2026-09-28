import {
  getCountries,
  getCountryCallingCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js';

// Mismas reglas y mensaje que apps/api/src/common/phone.ts; ambos lados se prueban con test/casos-de-validacion.json.

export type { CountryCode };

export const PHONE_INVALID = 'Escribe un teléfono válido, por ejemplo 0991234567 o +57 601 234 5678.';

/** E.164 (`+593991234567`). Sin `+`, el número es del país indicado (Ecuador por defecto). `null` si no es válido. */
export function normalizePhone(value: string, country: CountryCode = 'EC') {
  const phone = parsePhoneNumberFromString(value, country);
  return phone?.isValid() ? phone.number : null;
}

export function phoneError(value: string, country: CountryCode = 'EC'): string | null {
  return !value.trim() || normalizePhone(value, country) ? null : PHONE_INVALID;
}

/** El país que llega del formulario; si no es uno conocido, Ecuador. */
export const countryOrEcuador = (value: string): CountryCode => (isSupportedCountry(value) ? value : 'EC');

/** Solo el prefijo (`+593`): no depende de los datos de idioma, así que coincide en el servidor y el navegador. */
export const callingCodeLabel = (country: CountryCode) => `+${getCountryCallingCode(country)}`;

const regionNames = new Intl.DisplayNames(['es'], { type: 'region' });

/** Países con su prefijo, ordenados por su nombre en español: `{ code: 'CO', label: 'Colombia (+57)' }`. */
export const COUNTRIES = getCountries()
  .map((code) => ({ code, label: `${regionNames.of(code) ?? code} (+${getCountryCallingCode(code)})` }))
  .sort((a, b) => a.label.localeCompare(b.label, 'es'));

/** País y número nacional de un teléfono guardado en E.164, para editarlo. */
export function splitPhone(value: string | null | undefined): { country: CountryCode; national: string } {
  const phone = value ? parsePhoneNumberFromString(value) : undefined;
  return phone?.country
    ? { country: phone.country, national: phone.formatNational() }
    : { country: 'EC', national: value ?? '' };
}

/** `+593991234567` → `+593 99 123 4567`. */
export const formatPhone = (value: string) => parsePhoneNumberFromString(value)?.formatInternational() ?? value;
