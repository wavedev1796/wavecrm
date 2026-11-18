import { ListPageSkeleton } from "@/components/layout/loading-skeletons";
import { LISTADO_COTIZACIONES } from "@/content/cotizaciones";

export default function QuotesLoading() {
  return <ListPageSkeleton columns={LISTADO_COTIZACIONES.columnas} label={LISTADO_COTIZACIONES.cargando} />;
}
