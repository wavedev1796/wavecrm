import { ImportPageSkeleton } from "@/components/layout/loading-skeletons";
import { IMPORTACION } from "@/content/importacion";

export default function ContactImportLoading() {
  return <ImportPageSkeleton label={IMPORTACION.cargando} />;
}
