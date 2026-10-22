import { Building2 } from "lucide-react";
import { Suspense } from "react";
import { ListFilters } from "@/components/data/list-filters";
import { ListHeader } from "@/components/data/list-header";
import { TableSkeleton } from "@/components/layout/loading-skeletons";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EMPRESAS } from "@/content/empresas";
import { listQuery } from "@/lib/list-params";
import { NewCompanyDialog } from "../../../../features/empresas/new-company-dialog";
import { CompaniesResults, CompaniesSummary } from "../../../../features/empresas/companies-results";

type PageProps = Readonly<{
  searchParams: Promise<{
    search?: string;
    province?: string;
    tag?: string;
    page?: string;
    creada?: string;
  }>;
}>;
const PAGE_SIZE = 10;

export default async function CompaniesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = String(listQuery(params, PAGE_SIZE));
  const texto = EMPRESAS.listado;

  // La `key` crea un límite nuevo en cada búsqueda: así el esqueleto aparece también al
  // filtrar o paginar. Sin ella, la navegación (una transición) deja la tabla anterior.
  return (
    <div className="contacts-page">
      {params.creada === "1" && <Alert tone="success">{texto.creada}</Alert>}
      <Card className="data-card">
        <ListHeader
          icon={<Building2 aria-hidden />}
          title={texto.titulo}
          summary={
            <Suspense key={query} fallback={<Skeleton className="skeleton-text" />}>
              <CompaniesSummary query={query} />
            </Suspense>
          }
          importHref="/empresas/importar"
        >
          <NewCompanyDialog />
        </ListHeader>
        <ListFilters
          basePath="/empresas"
          params={params}
          searchLabel={texto.buscar.etiqueta}
          searchPlaceholder={texto.buscar.placeholder}
        />
        <Suspense
          key={query}
          fallback={
            <TableSkeleton columns={texto.columnas} label={texto.cargando} rows={PAGE_SIZE} />
          }
        >
          <CompaniesResults query={query} params={params} />
        </Suspense>
      </Card>
    </div>
  );
}
