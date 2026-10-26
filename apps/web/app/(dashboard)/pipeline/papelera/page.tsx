import "../../../../styles/pipeline.css";
import Link from "next/link";
import { Trash2 } from "lucide-react";
import { Pagination } from "@/components/data/pagination";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { PAPELERA } from "@/content/pipeline";
import { authenticatedApi } from "@/lib/authenticated-api";
import { listQuery } from "@/lib/list-params";
import { RejectedTrash } from "../../../../features/pipeline/rejected-trash";
import type { RejectedDeal } from "../../../../features/pipeline/types";

type PageProps = Readonly<{ searchParams: Promise<{ page?: string }> }>;
type DealList = {
  data: RejectedDeal[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};
const PAGE_SIZE = 20;

/** Papelera: los negocios rechazados de todos los pipelines, del más reciente al más antiguo. */
export default async function TrashPage({ searchParams }: PageProps) {
  const query = listQuery({ page: (await searchParams).page }, PAGE_SIZE);
  query.set("status", "REJECTED");
  const [response, me] = await Promise.all([
    authenticatedApi("/deals?" + query),
    authenticatedApi("/auth/me"),
  ]);
  const canReopen = me.ok && ((await me.json()) as { role?: string }).role === "ADMIN";
  const result = response.ok ? ((await response.json()) as DealList) : null;
  return (
    <div className="contacts-page">
      <Link className="back-link" href="/pipeline">
        {PAPELERA.volver}
      </Link>
      <Card className="data-card">
        <header className="contact-list-header">
          <div className="contact-list-title">
            <span className="contact-list-mark trash-mark">
              <Trash2 aria-hidden />
            </span>
            <div>
              <span>{PAPELERA.etiqueta}</span>
              <h2>{PAPELERA.titulo}</h2>
              <p>{PAPELERA.descripcion(result?.meta.total ?? 0)}</p>
            </div>
          </div>
        </header>
        {result ? (
          <RejectedTrash deals={result.data} canReopen={canReopen}>
            <Pagination
              basePath="/pipeline/papelera"
              params={{}}
              meta={result.meta}
              shown={result.data.length}
              label={PAPELERA.paginacion}
            />
          </RejectedTrash>
        ) : (
          <div className="data-card-alert">
            <Alert tone="error">{PAPELERA.errorCarga}</Alert>
          </div>
        )}
      </Card>
    </div>
  );
}
