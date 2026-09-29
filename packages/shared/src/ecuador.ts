// Reglas compartidas de identificación y provincia de Ecuador.

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
  const sum = [...value].slice(0, 9).reduce((total, digit, index) => {
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
  // ponytail: módulo 11 estricto también para sociedades privadas, como pide el ticket. Si el SRI emite
  // un RUC real que no lo cumple, esta es la única línea que hay que relajar.
  if (third === 9) return mod11(value, [4, 3, 2, 7, 6, 5, 4, 3, 2]) === Number(value[9]) && value.slice(10) !== '000';
  if (third === 6) return mod11(value, [3, 2, 7, 6, 5, 4, 3, 2]) === Number(value[8]) && value.slice(9) !== '0000';
  return false;
}

// Documento de un contacto (ajustes del Sprint 2): cédula, RUC de persona natural o pasaporte.

export const DOCUMENT_TYPES = ['CEDULA', 'RUC', 'PASAPORTE'] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const isDocumentType = (value: unknown): value is DocumentType =>
  (DOCUMENT_TYPES as readonly unknown[]).includes(value);

/** Cédula y RUC solo con dígitos; el pasaporte en mayúsculas, sin espacios ni guiones. */
export const normalizeDocument = (type: unknown, value: string) =>
  type === 'PASAPORTE' ? value.replace(/[\s-]/g, '').toUpperCase() : normalizeDigits(value);

/** Mensaje del número (ya normalizado y no vacío) según su tipo, o `null` si es válido. */
export function documentError(type: DocumentType, value: string): string | null {
  if (type === 'PASAPORTE') {
    return /^[A-Z0-9]{6,20}$/.test(value) ? null : 'El pasaporte debe tener entre 6 y 20 letras o números.';
  }
  if (type === 'CEDULA') {
    if (!/^\d{10}$/.test(value)) return 'La cédula debe tener 10 dígitos.';
    return isCedula(value) ? null : 'La cédula no es válida.';
  }
  if (!/^\d{13}$/.test(value)) return 'El RUC debe tener 13 dígitos.';
  if (!isRuc(value)) return 'El RUC no es válido.';
  return Number(value[2]) <= 5 ? null : 'El RUC de una persona natural es su cédula seguida de 001.';
}
