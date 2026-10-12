import { ImportPageSkeleton } from "@/components/layout/loading-skeletons";
import { IMPORTACION } from "@/content/importacion";

export default function CompanyImportLoading() {
  return <ImportPageSkeleton label={IMPORTACION.cargando} />;
}
