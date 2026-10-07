import { ImportPage } from "@/components/csv-import/import-page";
import { IMPORTACION } from "@/content/importacion";
import { importCompanies } from "./actions";
import { COMPANY_IMPORT_FIELDS } from "./fields";

export default function ImportCompaniesPage() {
  return (
    <ImportPage
      title={IMPORTACION.empresas.titulo}
      rules={IMPORTACION.empresas.reglas}
      guide={IMPORTACION.empresas}
      fields={COMPANY_IMPORT_FIELDS}
      action={importCompanies}
      noun={IMPORTACION.empresas.varios}
      listHref="/empresas"
    />
  );
}
