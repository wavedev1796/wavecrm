import {
  documentError as documentNumberError,
  isCedula,
  isDocumentType,
  isRuc,
  officialProvince,
  type DocumentType,
} from "@wave/shared";

export { normalizeDigits, normalizeDocument, PROVINCES } from "@wave/shared";

export {
  isCedula,
  isDocumentType,
  isRuc,
  officialProvince,
  type DocumentType,
};

/** Espera la cédula normalizada. Vacía es válida porque el campo es opcional. */
export function cedulaError(value: string): string | null {
  if (!value) return null;
  if (!/^\d{10}$/.test(value)) return "La cédula debe tener 10 dígitos.";
  return isCedula(value) ? null : "La cédula no es válida.";
}

/** Espera el RUC normalizado. Vacío es válido porque el campo es opcional. */
export function rucError(value: string): string | null {
  if (!value) return null;
  if (!/^\d{13}$/.test(value)) return "El RUC debe tener 13 dígitos.";
  return isRuc(value) ? null : "El RUC no es válido.";
}

export function provinceError(value: string): string | null {
  return !value.trim() || officialProvince(value)
    ? null
    : "Elige una provincia de Ecuador.";
}

// Metadatos visuales; las reglas y los valores válidos viven en @wave/shared.
export const DOCUMENT_TYPES = [
  { value: "CEDULA", label: "Cédula", placeholder: "1712345675" },
  { value: "RUC", label: "RUC", placeholder: "1712345675001" },
  { value: "PASAPORTE", label: "Pasaporte", placeholder: "AB123456" },
] as const satisfies ReadonlyArray<{
  value: DocumentType;
  label: string;
  placeholder: string;
}>;

/** Tipo y número van juntos; los dos vacíos representan un contacto sin documento. */
export function documentError(type: string, value: string): string | null {
  if (!type && !value) return null;
  if (!type) return "Elige el tipo de documento.";
  if (!isDocumentType(type)) return "Elige un tipo de documento válido.";
  if (!value) return "Ingresa el número de documento.";
  return documentNumberError(type, value);
}
