import { ImportPage } from "@/features/importacion-csv/import-page";
import { IMPORTACION } from "@/content/importacion";
import { importCompanies } from "../../../../features/empresas/importar/actions";
import { COMPANY_IMPORT_FIELDS } from "../../../../features/empresas/importar/fields";

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
