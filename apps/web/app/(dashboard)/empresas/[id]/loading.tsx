import { DetailPageSkeleton } from "@/components/layout/loading-skeletons";
import { EMPRESAS } from "@/content/empresas";

export default function CompanyDetailLoading() {
  return <DetailPageSkeleton label={EMPRESAS.ficha.cargando} />;
}
