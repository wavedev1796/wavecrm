import type { ImportFieldSpec } from "@/components/csv-import/csv-header";

/** Campos de la importación de contactos (POST /contacts/import), con los alias que se proponen. */
export const CONTACT_IMPORT_FIELDS = [
  {
    field: "firstName",
    label: "Nombre",
    required: true,
    aliases: ["nombre", "nombres", "primer nombre"],
  },
  {
    field: "lastName",
    label: "Apellido",
    required: true,
    aliases: ["apellido", "apellidos"],
  },
  {
    field: "documentId",
    label: "Cédula",
    aliases: ["cedula", "identificacion", "numero de cedula"],
  },
  {
    field: "email",
    label: "Correo",
    aliases: ["correo", "email", "e-mail", "correo electronico"],
  },
  {
    field: "phone",
    label: "Teléfono",
    aliases: ["telefono", "celular", "movil"],
  },
  { field: "province", label: "Provincia", aliases: ["provincia"] },
  { field: "city", label: "Ciudad", aliases: ["ciudad", "canton"] },
  { field: "position", label: "Cargo", aliases: ["cargo", "puesto"] },
  {
    field: "tags",
    label: "Etiquetas",
    aliases: ["etiquetas", "etiqueta", "segmento"],
  },
  {
    field: "companyTaxId",
    label: "RUC de la empresa",
    aliases: ["ruc empresa", "ruc de la empresa", "ruc"],
  },
] as const satisfies readonly ImportFieldSpec[];
