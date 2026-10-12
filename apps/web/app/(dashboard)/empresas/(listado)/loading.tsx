import { ListPageSkeleton } from "@/components/layout/loading-skeletons";
import { EMPRESAS } from "@/content/empresas";

export default function CompaniesLoading() {
  return (
    <ListPageSkeleton columns={EMPRESAS.listado.columnas} label={EMPRESAS.listado.cargando} />
  );
}
