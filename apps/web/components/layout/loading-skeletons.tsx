import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table } from "@/components/ui/table";

/** Lo único que oye el lector de pantalla es `label`; los bloques son decorativos. */
function LoadingRegion({
  label,
  children,
}: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    <output aria-label={label} className="loading-region">
      <span className="sr-only">{label}</span>
      {children}
    </output>
  );
}

type TableProps = Readonly<{
  /** Mismos encabezados que la tabla real, para que las columnas no salten. */
  columns: readonly string[];
  label: string;
  rows?: number;
  /** La primera columna lleva avatar, como en contactos y usuarios. */
  withAvatar?: boolean;
  className?: string;
}>;

/**
 * Tabla y paginación de un listado mientras llegan los datos. Los bloques van dentro de
 * <strong>, <small> y <td> reales: heredan su alto de línea y la fila mide lo mismo que la real.
 */
export function TableSkeleton({
  columns,
  label,
  rows = 10,
  withAvatar = false,
  className,
}: TableProps) {
  return (
    <LoadingRegion label={label}>
      <Table aria-hidden="true" className={className}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }, (_, row) => (
            <tr key={row}>
              {columns.map((column, index) => (
                <td key={column}>
                  {index === 0 ? (
                    <span className="contact-cell">
                      {withAvatar && <Skeleton className="skeleton-avatar skeleton-avatar--sm" />}
                      <span>
                        <strong>
                          <Skeleton className="skeleton-text" />
                        </strong>
                        <small>
                          <Skeleton className="skeleton-text skeleton-text--short" />
                        </small>
                      </span>
                    </span>
                  ) : (
                    <Skeleton className="skeleton-text skeleton-text--short" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </Table>
      <div className="table-footer" aria-hidden="true">
        <span>
          <Skeleton className="skeleton-text" />
        </span>
        <div>
          <Skeleton className="skeleton-page-button" />
          <Skeleton className="skeleton-page-button" />
        </div>
      </div>
    </LoadingRegion>
  );
}

type ListProps = Readonly<{
  columns: readonly string[];
  label: string;
  withAvatar?: boolean;
}>;

/** Directorio completo (cabecera, filtros y tabla) con las clases del contenido real. */
export function ListPageSkeleton({ columns, label, withAvatar }: ListProps) {
  return (
    <div className="contacts-page">
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
          <div className="contact-list-actions">
            <Skeleton className="skeleton-button" />
            <Skeleton className="skeleton-button" />
          </div>
        </header>
        <div className="contact-filter-panel" aria-hidden="true">
          <Skeleton className="skeleton-search" />
          <div className="contact-filter-fields">
            <Skeleton className="skeleton-field skeleton-field--select" />
            <Skeleton className="skeleton-field skeleton-field--input" />
            <Skeleton className="skeleton-field skeleton-field--button" />
          </div>
        </div>
        <TableSkeleton columns={columns} label={label} withAvatar={withAvatar} />
      </Card>
    </div>
  );
}

export function DetailPageSkeleton({ label }: Readonly<{ label: string }>) {
  return (
    <LoadingRegion label={label}>
      <div className="contact-detail-page" aria-hidden="true">
        <span className="back-link">
          <Skeleton className="skeleton-text" />
        </span>
        <section className="contact-profile card">
          <Skeleton className="skeleton-avatar" />
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

export function ImportPageSkeleton({ label }: Readonly<{ label: string }>) {
  return (
    <LoadingRegion label={label}>
      <Card className="skeleton-import-card" aria-hidden="true">
        <Skeleton className="skeleton-heading" />
        <Skeleton className="skeleton-summary" />
        <Skeleton className="skeleton-dropzone" />
        <Skeleton className="skeleton-button" />
      </Card>
    </LoadingRegion>
  );
}

export function UsersPageSkeleton({
  columns,
  label,
}: Readonly<{ columns: readonly string[]; label: string }>) {
  return (
    <div className="users-page">
      <section className="user-summary" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <span>
              <Skeleton className="skeleton-text skeleton-text--short" />
            </span>
            <strong>
              <Skeleton className="skeleton-text skeleton-text--short" />
            </strong>
          </Card>
        ))}
      </section>
      <Card className="invite-panel" aria-hidden="true">
        <div className="skeleton-invite">
          <Skeleton className="skeleton-text skeleton-text--wide" />
        </div>
      </Card>
      <Card className="data-card users-data-card">
        <div className="table-toolbar users-toolbar" aria-hidden="true">
          <Skeleton className="skeleton-search" />
          <div>
            <Skeleton className="skeleton-field skeleton-field--select" />
            <Skeleton className="skeleton-field skeleton-field--button" />
          </div>
        </div>
        <TableSkeleton columns={columns} label={label} withAvatar className="users-table" />
      </Card>
    </div>
  );
}
