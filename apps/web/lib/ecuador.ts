import {
  documentError as documentNumberError,
  isCedula,
  isDocumentType,
  isRuc,
  officialProvince,
  type DocumentType,
} from "@wave/shared";
import { TIPO_DOCUMENTO } from "@/content/catalogos";

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
  {
    value: "CEDULA",
    label: TIPO_DOCUMENTO.CEDULA.etiqueta,
    placeholder: TIPO_DOCUMENTO.CEDULA.ejemplo,
  },
  {
    value: "RUC",
    label: TIPO_DOCUMENTO.RUC.etiqueta,
    placeholder: TIPO_DOCUMENTO.RUC.ejemplo,
  },
  {
    value: "PASAPORTE",
    label: TIPO_DOCUMENTO.PASAPORTE.etiqueta,
    placeholder: TIPO_DOCUMENTO.PASAPORTE.ejemplo,
  },
] as const satisfies ReadonlyArray<{
  value: DocumentType;
  label: string;
  placeholder: string;
}>;

/** El documento del contacto es obligatorio: tipo y número, validado con las reglas de su tipo. */
export function documentError(type: string, value: string): string | null {
  if (!type) return "Elige el tipo de documento.";
  if (!isDocumentType(type)) return "Elige un tipo de documento válido.";
  if (!value) return "Ingresa el número de documento.";
  return documentNumberError(type, value);
}
