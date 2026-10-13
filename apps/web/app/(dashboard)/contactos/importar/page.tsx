import { ImportPage } from "@/features/importacion-csv/import-page";
import { IMPORTACION } from "@/content/importacion";
import { importContacts } from "../../../../features/contactos/importar/actions";
import { CONTACT_IMPORT_FIELDS } from "../../../../features/contactos/importar/fields";

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
