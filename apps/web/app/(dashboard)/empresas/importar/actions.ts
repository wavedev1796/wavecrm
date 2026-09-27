"use server";

import { sendImport, type ImportState } from "@/lib/csv-import";

export async function importCompanies(
  _state: ImportState,
  formData: FormData,
): Promise<ImportState> {
  return sendImport(
    "/companies/import",
    formData,
    { one: "empresa", many: "empresas" },
    "/empresas",
  );
}
