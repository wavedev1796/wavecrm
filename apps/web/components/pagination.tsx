import Link from "next/link";
import { COMUN } from "@/content/comun";
import { listHref, type ListParams } from "@/lib/list-params";

type Props = Readonly<{
  basePath: string;
  params: ListParams;
  meta: { page: number; limit: number; total: number; totalPages: number };
  shown: number;
  label: string;
}>;

export function Pagination({ basePath, params, meta, shown, label }: Props) {
  const first = (meta.page - 1) * meta.limit;
  return (
    <nav className="table-footer" aria-label={label}>
      <span>
        {shown
          ? COMUN.paginacion.rango(first + 1, first + shown, meta.total)
          : COMUN.paginacion.vacia(meta.total)}{" "}
        {COMUN.paginacion.pagina(meta.page, Math.max(meta.totalPages, 1))}
      </span>
      <div>
        <PageLink
          href={
            meta.page > 1 ? listHref(basePath, params, meta.page - 1) : null
          }
        >
          {COMUN.paginacion.anterior}
        </PageLink>
        <PageLink
          href={
            meta.page < meta.totalPages
              ? listHref(basePath, params, meta.page + 1)
              : null
          }
        >
          {COMUN.paginacion.siguiente}
        </PageLink>
      </div>
    </nav>
  );
}

function PageLink({
  href,
  children,
}: Readonly<{ href: string | null; children: string }>) {
  return href ? (
    <Link className="button button--secondary" href={href}>
      {children}
    </Link>
  ) : (
    <span className="button button--secondary" aria-disabled="true">
      {children}
    </span>
  );
}
