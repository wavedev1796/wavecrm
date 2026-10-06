"use server";

import { IMPORTACION } from "@/content/importacion";
import { sendImport, type ImportState } from "@/lib/csv-import";

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
