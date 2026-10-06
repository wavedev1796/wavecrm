"use server";

import { IMPORTACION } from "@/content/importacion";
import { sendImport, type ImportState } from "@/lib/csv-import";

export async function importContacts(
  _state: ImportState,
  formData: FormData,
): Promise<ImportState> {
  return sendImport(
    "/contacts/import",
    formData,
    { one: IMPORTACION.contactos.uno, many: IMPORTACION.contactos.varios },
    "/contactos",
  );
}
