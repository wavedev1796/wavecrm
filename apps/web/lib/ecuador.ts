// Mismas reglas y mensajes que apps/api/src/common/ecuador.ts y los decoradores de apps/api/src/common/validation.ts.
// Ambos lados se prueban con test/casos-de-validacion.json. Las usan las pantallas de contactos y empresas (CRM-14, CRM-15).

export const PROVINCES = [
  'Azuay',
  'Bolívar',
  'Cañar',
  'Carchi',
  'Chimborazo',
  'Cotopaxi',
  'El Oro',
  'Esmeraldas',
  'Galápagos',
  'Guayas',
  'Imbabura',
  'Loja',
  'Los Ríos',
  'Manabí',
  'Morona Santiago',
  'Napo',
  'Orellana',
  'Pastaza',
  'Pichincha',
  'Santa Elena',
  'Santo Domingo de los Tsáchilas',
  'Sucumbíos',
  'Tungurahua',
  'Zamora Chinchipe',
] as const;

/** Quita espacios y guiones: `171234567-5` → `1712345675`. */
export const normalizeDigits = (value: string) => value.replace(/[\s-]/g, '');

const withoutAccents = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '').trim().toLowerCase();
const PROVINCE_BY_KEY = new Map<string, string>(PROVINCES.map((name) => [withoutAccents(name), name]));

/** Nombre oficial de la provincia sin importar mayúsculas ni tildes; `null` si no es de Ecuador. */
export const officialProvince = (value: string) => PROVINCE_BY_KEY.get(withoutAccents(value)) ?? null;

/** Código de provincia 01–24, o 30 para ecuatorianos registrados en el exterior. */
function validProvinceCode(value: string) {
  const code = Number(value.slice(0, 2));
  return (code >= 1 && code <= 24) || code === 30;
}

/** Módulo 11 del SRI; `null` cuando el resto da 10, que ningún número válido produce. */
function mod11(value: string, coefficients: number[]) {
  const sum = coefficients.reduce((total, coefficient, index) => total + Number(value[index]) * coefficient, 0);
  const check = 11 - (sum % 11);
  if (check === 11) return 0;
  return check === 10 ? null : check;
}

export function isCedula(value: string) {
  if (!/^\d{10}$/.test(value) || !validProvinceCode(value) || Number(value[2]) > 5) return false;
  const sum = [...value.slice(0, 9)].reduce((total, digit, index) => {
    const product = Number(digit) * (index % 2 === 0 ? 2 : 1);
    return total + (product > 9 ? product - 9 : product);
  }, 0);
  return (10 - (sum % 10)) % 10 === Number(value[9]);
}

/** RUC de persona natural (tercer dígito 0–5), sociedad privada (9) o entidad pública (6). */
export function isRuc(value: string) {
  if (!/^\d{13}$/.test(value) || !validProvinceCode(value)) return false;
  const third = Number(value[2]);
  if (third <= 5) return isCedula(value.slice(0, 10)) && value.slice(10) !== '000';
  // ponytail: módulo 11 estricto también para sociedades privadas, igual que el API.
  if (third === 9) return mod11(value, [4, 3, 2, 7, 6, 5, 4, 3, 2]) === Number(value[9]) && value.slice(10) !== '000';
  if (third === 6) return mod11(value, [3, 2, 7, 6, 5, 4, 3, 2]) === Number(value[8]) && value.slice(9) !== '0000';
  return false;
}

// Tras el prefijo (+593, 593 o 0): fijos de 8 dígitos (área 2–7) o móviles de 9 (empiezan por 9).
const PHONE_PATTERN = /^(?:\+?593|0)([2-7]\d{7}|9\d{8})$/;

/** Teléfono de Ecuador en E.164 (`+593…`), o `null` si no lo es. */
export function normalizePhone(value: string) {
  const match = PHONE_PATTERN.exec(value.replace(/[\s().-]/g, ''));
  return match ? `+593${match[1]}` : null;
}

const PHONE_INVALID = 'Escribe un teléfono de Ecuador, por ejemplo 0991234567 o 022345678.';

/** Espera la cédula normalizada con `normalizeDigits`. Vacía es válida: el campo es opcional. */
export function cedulaError(value: string): string | null {
  if (!value) return null;
  if (!/^\d{10}$/.test(value)) return 'La cédula debe tener 10 dígitos.';
  return isCedula(value) ? null : 'La cédula no es válida.';
}

/** Espera el RUC normalizado con `normalizeDigits`. Vacío es válido: el campo es opcional. */
export function rucError(value: string): string | null {
  if (!value) return null;
  if (!/^\d{13}$/.test(value)) return 'El RUC debe tener 13 dígitos.';
  return isRuc(value) ? null : 'El RUC no es válido.';
}

export function phoneError(value: string): string | null {
  return !value.trim() || normalizePhone(value) ? null : PHONE_INVALID;
}

export function provinceError(value: string): string | null {
  return !value.trim() || officialProvince(value) ? null : 'Elige una provincia de Ecuador.';
}
