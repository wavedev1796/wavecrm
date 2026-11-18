import { Filter, FileText, X } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { LiveSearch } from "@/components/data/live-search";
import { TableSkeleton } from "@/components/layout/loading-skeletons";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ESTADO_COTIZACION } from "@/content/catalogos";
import { COMUN } from "@/content/comun";
import { LISTADO_COTIZACIONES as texto } from "@/content/cotizaciones";
import { listQuery } from "@/lib/list-params";
import { QuotesResults, QuotesSummary } from "../../../../features/quotes/quotes-results";
// Los diálogos de aceptar y rechazar usan las clases del modal del negocio.
import "../../../../styles/pipeline.css";

type PageProps = Readonly<{ searchParams: Promise<{ search?: string; status?: string; page?: string }> }>;
const PAGE_SIZE = 10;
const BASE = "/cotizaciones";

/** Todas las versiones de cotización del alcance del usuario (ADMIN todas, VENDEDOR las de sus negocios). */
export default async function QuotesPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  // Un estado desconocido se ignora: el API respondería 400.
  const params = { search: raw.search, status: raw.status && Object.hasOwn(ESTADO_COTIZACION, raw.status) ? raw.status : undefined };
  const query = String(listQuery({ ...params, page: raw.page }, PAGE_SIZE));

  return (
    <div className="contacts-page">
      <Card className="data-card">
        <header className="contact-list-header">
          <div className="contact-list-title">
            <span className="contact-list-mark"><FileText aria-hidden /></span>
            <div>
              <span>{texto.etiqueta}</span>
              <h2>{texto.titulo}</h2>
              <p>
                <Suspense key={query} fallback={<Skeleton className="skeleton-text" />}>
                  <QuotesSummary query={query} />
                </Suspense>
              </p>
            </div>
          </div>
        </header>
        <form className="contact-filter-panel" method="get" action={BASE}>
          <LiveSearch basePath={BASE} params={params} label={texto.buscar.etiqueta} placeholder={texto.buscar.placeholder} />
          <div className="contact-filter-fields">
            <Select name="status" defaultValue={params.status ?? ""} aria-label={texto.estado}>
              <option value="">{texto.todosLosEstados}</option>
              {Object.entries(ESTADO_COTIZACION).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </Select>
            <Button type="submit"><Filter aria-hidden />{COMUN.filtros.aplicar}</Button>
            {(params.search || params.status) && (
              <Link className="button button--ghost" href={BASE}><X aria-hidden />{COMUN.filtros.limpiar}</Link>
            )}
          </div>
        </form>
        <Suspense key={query} fallback={<TableSkeleton columns={texto.columnas} label={texto.cargando} rows={PAGE_SIZE} />}>
          <QuotesResults query={query} params={params} />
        </Suspense>
      </Card>
    </div>
  );
}
