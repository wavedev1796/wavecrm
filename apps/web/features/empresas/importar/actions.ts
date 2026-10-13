"use server";

import { IMPORTACION } from "@/content/importacion";
import { sendImport, type ImportState } from "@/features/importacion-csv/csv-import";

export async function importCompanies(
  _state: ImportState,
  formData: FormData,
): Promise<ImportState> {
  return sendImport(
    "/companies/import",
    formData,
    { one: IMPORTACION.empresas.uno, many: IMPORTACION.empresas.varios },
    "/empresas",
  );
}
