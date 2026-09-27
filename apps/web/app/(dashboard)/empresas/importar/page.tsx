import { ImportPage } from "@/components/csv-import/import-page";
import { importCompanies } from "./actions";
import { COMPANY_IMPORT_FIELDS } from "./fields";

export default function ImportCompaniesPage() {
  return (
    <ImportPage
      title="Importar empresas desde CSV"
      rules={[
        "Nombre y RUC son obligatorios; el resto de columnas es opcional.",
        "Cada RUC debe ser válido y no estar registrado. Separa las etiquetas con comas dentro de la celda.",
      ]}
      fields={COMPANY_IMPORT_FIELDS}
      action={importCompanies}
      noun="empresas"
      listHref="/empresas"
    />
  );
}
