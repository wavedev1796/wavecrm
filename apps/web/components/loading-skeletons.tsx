import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function LoadingRegion({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div role="status" aria-label="Cargando contenido" className="loading-region">
      <span className="sr-only">Cargando contenido</span>
      {children}
    </div>
  );
}

export function ListPageSkeleton({ columns = 5 }: Readonly<{ columns?: number }>) {
  return (
    <LoadingRegion>
      <div className="contacts-page" aria-hidden="true">
        <Card className="data-card">
          <div className="skeleton-list-header">
            <div className="skeleton-title-group">
              <Skeleton className="skeleton-icon" />
              <div>
                <Skeleton className="skeleton-heading" />
                <Skeleton className="skeleton-summary" />
              </div>
            </div>
            <div className="skeleton-actions">
              <Skeleton className="skeleton-button" />
              <Skeleton className="skeleton-button skeleton-button--short" />
            </div>
          </div>
          <div className="skeleton-filters">
            <Skeleton className="skeleton-control skeleton-control--wide" />
            <Skeleton className="skeleton-control" />
            <Skeleton className="skeleton-button skeleton-button--short" />
          </div>
          <div className="skeleton-table" style={{ "--skeleton-columns": columns } as React.CSSProperties}>
            <div className="skeleton-table-row skeleton-table-head">
              {Array.from({ length: columns }, (_, index) => (
                <Skeleton key={`head-${index}`} className="skeleton-cell" />
              ))}
            </div>
            {Array.from({ length: 5 }, (_, row) => (
              <div className="skeleton-table-row" key={`row-${row}`}>
                {Array.from({ length: columns }, (_, column) => (
                  <Skeleton key={`cell-${row}-${column}`} className="skeleton-cell" />
                ))}
              </div>
            ))}
          </div>
          <div className="skeleton-pagination">
            <Skeleton className="skeleton-summary" />
            <Skeleton className="skeleton-button" />
          </div>
        </Card>
      </div>
    </LoadingRegion>
  );
}

export function DetailPageSkeleton() {
  return (
    <LoadingRegion>
      <div className="contact-detail-page" aria-hidden="true">
        <Skeleton className="skeleton-back-link" />
        <section className="contact-profile card skeleton-profile">
          <Skeleton className="skeleton-avatar" />
          <div>
            <Skeleton className="skeleton-summary" />
            <Skeleton className="skeleton-heading" />
            <Skeleton className="skeleton-summary" />
          </div>
          <Skeleton className="skeleton-tag" />
        </section>
        <div className="contact-detail-grid">
          <div className="contact-detail-main">
            <Card className="contact-data-card">
              <Skeleton className="skeleton-heading" />
              {Array.from({ length: 5 }, (_, index) => (
                <div className="skeleton-info-row" key={index}>
                  <Skeleton className="skeleton-summary" />
                  <Skeleton className="skeleton-info-value" />
                </div>
              ))}
            </Card>
            <Card className="contact-related">
              <Skeleton className="skeleton-heading" />
              {Array.from({ length: 2 }, (_, index) => (
                <div className="skeleton-related-row" key={index}>
                  <Skeleton className="skeleton-summary" />
                  <Skeleton className="skeleton-summary" />
                </div>
              ))}
            </Card>
          </div>
          <Card className="contact-data-card skeleton-form">
            <Skeleton className="skeleton-heading" />
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton className="skeleton-control" key={index} />
            ))}
            <Skeleton className="skeleton-button" />
          </Card>
        </div>
      </div>
    </LoadingRegion>
  );
}

export function UsersPageSkeleton() {
  return (
    <LoadingRegion>
      <div className="users-page" aria-hidden="true">
        <section className="user-summary">
          {Array.from({ length: 4 }, (_, index) => (
            <Card key={index}>
              <Skeleton className="skeleton-summary" />
              <Skeleton className="skeleton-stat" />
            </Card>
          ))}
        </section>
        <Card className="skeleton-invite">
          <Skeleton className="skeleton-heading" />
        </Card>
        <Card className="data-card users-data-card">
          <div className="skeleton-filters">
            <Skeleton className="skeleton-control skeleton-control--wide" />
            <Skeleton className="skeleton-control" />
            <Skeleton className="skeleton-button skeleton-button--short" />
          </div>
          <div className="skeleton-table" style={{ "--skeleton-columns": 5 } as React.CSSProperties}>
            {Array.from({ length: 6 }, (_, row) => (
              <div className="skeleton-table-row" key={row}>
                {Array.from({ length: 5 }, (_, column) => (
                  <Skeleton className="skeleton-cell" key={`${row}-${column}`} />
                ))}
              </div>
            ))}
          </div>
          <div className="skeleton-pagination">
            <Skeleton className="skeleton-summary" />
            <Skeleton className="skeleton-button" />
          </div>
        </Card>
      </div>
    </LoadingRegion>
  );
}
