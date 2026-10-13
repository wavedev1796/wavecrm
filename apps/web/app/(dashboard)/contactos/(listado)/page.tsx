import { UsersRound } from "lucide-react";
import { Suspense } from "react";
import { ListFilters } from "@/components/data/list-filters";
import { ListHeader } from "@/components/data/list-header";
import { TableSkeleton } from "@/components/layout/loading-skeletons";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CONTACTOS } from "@/content/contactos";
import { listQuery } from "@/lib/list-params";
import { NewContactDialog } from "../../../../features/contactos/new-contact-dialog";
import { ContactsResults, ContactsSummary } from "../../../../features/contactos/contacts-results";

type PageProps = Readonly<{
  searchParams: Promise<{
    search?: string;
    province?: string;
    tag?: string;
    page?: string;
  }>;
}>;
const PAGE_SIZE = 10;

export default async function ContactsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const query = String(listQuery(params, PAGE_SIZE));
  const texto = CONTACTOS.listado;

  // La `key` crea un límite nuevo en cada búsqueda: así el esqueleto aparece también al
  // filtrar o paginar. Sin ella, la navegación (una transición) deja la tabla anterior.
  return (
    <div className="contacts-page">
      <Card className="data-card">
        <ListHeader
          icon={<UsersRound aria-hidden />}
          title={texto.titulo}
          summary={
            <Suspense key={query} fallback={<Skeleton className="skeleton-text" />}>
              <ContactsSummary query={query} />
            </Suspense>
          }
          importHref="/contactos/importar"
        >
          <NewContactDialog />
        </ListHeader>
        <ListFilters
          basePath="/contactos"
          params={params}
          searchLabel={texto.buscar.etiqueta}
          searchPlaceholder={texto.buscar.placeholder}
        />
        <Suspense
          key={query}
          fallback={
            <TableSkeleton
              columns={texto.columnas}
              label={texto.cargando}
              rows={PAGE_SIZE}
              withAvatar
            />
          }
        >
          <ContactsResults query={query} params={params} />
        </Suspense>
      </Card>
    </div>
  );
}
