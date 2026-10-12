import { DetailPageSkeleton } from "@/components/layout/loading-skeletons";
import { NEGOCIO } from "@/content/pipeline";

export default function DealDetailLoading() {
  return <DetailPageSkeleton label={NEGOCIO.cargando} />;
}
