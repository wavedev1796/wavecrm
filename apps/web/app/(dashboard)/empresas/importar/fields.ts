import type { ImportFieldSpec } from "@/components/csv-import/csv-header";

/** Campos de la importación de empresas (POST /companies/import), con los alias que se proponen. */
export const COMPANY_IMPORT_FIELDS = [
  {
    field: "name",
    label: "Nombre",
    required: true,
    aliases: ["nombre", "nombre comercial", "empresa"],
  },
  { field: "legalName", label: "Razón social", aliases: ["razon social"] },
  { field: "taxId", label: "RUC", required: true, aliases: ["ruc"] },
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
  { field: "city", label: "Cantón", aliases: ["canton", "ciudad"] },
  {
    field: "tags",
    label: "Etiquetas",
    aliases: ["etiquetas", "etiqueta", "segmento"],
  },
] as const satisfies readonly ImportFieldSpec[];
