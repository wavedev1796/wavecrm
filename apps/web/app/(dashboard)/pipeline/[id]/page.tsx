import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { NEGOCIO } from "@/content/pipeline";
import { authenticatedApi } from "@/lib/authenticated-api";
import { dealFormOptions } from "../../../../features/pipeline/data";
import { DealDetailTabs } from "../../../../features/pipeline/deal-detail-tabs";
import type { DealDetail } from "../../../../features/pipeline/types";
import { loadTimeline } from "../../../../features/timeline/actions";

export default async function DealPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  // El historial se pide aparte (paginado y con su propio alcance): un 404 suyo no oculta la ficha.
  const [response, me, timeline] = await Promise.all([
    authenticatedApi("/deals/" + encodeURIComponent(id)),
    authenticatedApi("/auth/me"),
    loadTimeline("deals", id),
  ]);
  if (response.status === 404) notFound();
  // Solo un ADMIN reabre o modifica un negocio cerrado; el API lo exige igual (403).
  const canReopen = me.ok && ((await me.json()) as { role?: string }).role === "ADMIN";
  if (!response.ok) return <Alert tone="error">{NEGOCIO.errorCarga}</Alert>;
  const deal = (await response.json()) as DealDetail;
  let options;
  try {
    options = await dealFormOptions();
  } catch (error) {
    unstable_rethrow(error);
    return <Alert tone="error">{NEGOCIO.errorCarga}</Alert>;
  }
  return (
    <div className="contact-detail-page">
      <Link className="back-link" href={"/pipeline?pipelineId=" + encodeURIComponent(deal.pipelineId)}>
        {NEGOCIO.volver}
      </Link>
      <DealDetailTabs deal={deal} options={options} canReopen={canReopen} timeline={timeline} members={options.users} />
    </div>
  );
}
