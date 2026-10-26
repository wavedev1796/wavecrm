import { TableSkeleton } from "@/components/layout/loading-skeletons";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PAPELERA } from "@/content/pipeline";

/** Mismo marcado que la papelera (sin filtros): enlace, cabecera, barra y tabla. */
export default function TrashLoading() {
  return (
    <div className="contacts-page">
      <span className="back-link" aria-hidden="true">
        <Skeleton className="skeleton-text" />
      </span>
      <Card className="data-card">
        <header className="contact-list-header" aria-hidden="true">
          <div className="contact-list-title">
            <Skeleton className="skeleton-icon" />
            <div>
              <span>
                <Skeleton className="skeleton-text skeleton-text--short" />
              </span>
              <h2>
                <Skeleton className="skeleton-text skeleton-text--wide" />
              </h2>
              <p>
                <Skeleton className="skeleton-text" />
              </p>
            </div>
          </div>
        </header>
        <div className="table-toolbar trash-toolbar" aria-hidden="true">
          <span />
          <Skeleton className="skeleton-button" />
        </div>
        <TableSkeleton columns={PAPELERA.columnas} label={PAPELERA.cargando} />
      </Card>
    </div>
  );
}
