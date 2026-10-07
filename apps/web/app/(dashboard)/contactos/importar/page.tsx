import { ImportPage } from "@/components/csv-import/import-page";
import { IMPORTACION } from "@/content/importacion";
import { importContacts } from "./actions";
import { CONTACT_IMPORT_FIELDS } from "./fields";

export default function ImportContactsPage() {
  return (
    <ImportPage
      title={IMPORTACION.contactos.titulo}
      rules={IMPORTACION.contactos.reglas}
      guide={IMPORTACION.contactos}
      fields={CONTACT_IMPORT_FIELDS}
      action={importContacts}
      noun={IMPORTACION.contactos.varios}
      listHref="/contactos"
    />
  );
}
