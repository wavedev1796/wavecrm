import { ImportPage } from "@/components/csv-import/import-page";
import { importContacts } from "./actions";
import { CONTACT_IMPORT_FIELDS } from "./fields";

export default function ImportContactsPage() {
  return (
    <ImportPage
      title="Importar contactos desde CSV"
      rules={[
        "Nombre y apellido son obligatorios; el resto de columnas es opcional.",
        "Separa las etiquetas con comas dentro de la celda. El RUC debe ser de una empresa ya registrada.",
      ]}
      fields={CONTACT_IMPORT_FIELDS}
      action={importContacts}
      noun="contactos"
      listHref="/contactos"
    />
  );
}
