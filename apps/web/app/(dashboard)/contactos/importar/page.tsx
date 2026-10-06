import { ImportPage } from "@/components/csv-import/import-page";
import { importContacts } from "./actions";
import { CONTACT_IMPORT_FIELDS } from "./fields";

export default function ImportContactsPage() {
  return (
    <ImportPage
      title="Importar contactos desde Excel o CSV"
      rules={[
        "Nombre, apellido, tipo y número de documento son obligatorios; el resto de columnas es opcional.",
        "El tipo de documento es Cédula, RUC o Pasaporte. El cantón debe ser de la provincia de la fila.",
        "Separa las etiquetas con comas dentro de la celda. El RUC de la empresa debe ser de una empresa ya registrada.",
      ]}
      fields={CONTACT_IMPORT_FIELDS}
      action={importContacts}
      noun="contactos"
      listHref="/contactos"
    />
  );
}
