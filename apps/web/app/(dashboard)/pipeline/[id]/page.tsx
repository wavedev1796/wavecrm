import "../pipeline.css";
import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";
import {
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarDays,
  Clock3,
  FileText,
  Mail,
  Phone,
  UserRound,
  Workflow,
} from "lucide-react";
import { Info } from "@/components/detail-info";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ESTADO_COTIZACION, ESTADO_NEGOCIO, MOTIVO_PERDIDA } from "@/content/catalogos";
import { NEGOCIO } from "@/content/pipeline";
import { authenticatedApi } from "@/lib/authenticated-api";
import { formatDateTime, formatDay, formatMoney } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { dealFormOptions } from "../data";
import { DealActions } from "../deal-actions";
import { DealItems } from "../deal-items";
import { DealTimeline } from "../deal-timeline";
import type { DealDetail } from "../types";

const TONO = { OPEN: "neutral", WON: "success", LOST: "warning" } as const;

export default async function DealPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  const response = await authenticatedApi("/deals/" + encodeURIComponent(id));
  if (response.status === 404) notFound();
  if (!response.ok) return <Alert tone="error">{NEGOCIO.errorCarga}</Alert>;
  const deal = (await response.json()) as DealDetail;
  let options;
  try {
    options = await dealFormOptions();
  } catch (error) {
    unstable_rethrow(error);
    return <Alert tone="error">{NEGOCIO.errorCarga}</Alert>;
  }
  const campos = NEGOCIO.campos;
  const cierre = NEGOCIO.cierre;
  const quote = deal.quotes[0];
  const contactPhone = deal.contact?.phone ?? deal.company?.phone;
  return (
    <div className="contact-detail-page">
      <Link className="back-link" href={"/pipeline?pipelineId=" + encodeURIComponent(deal.pipelineId)}>
        {NEGOCIO.volver}
      </Link>
      <section className="contact-profile card deal-profile">
        <span className="avatar contact-profile-avatar">
          <BriefcaseBusiness aria-hidden />
        </span>
        <div>
          <span>{NEGOCIO.etiqueta}</span>
          <h2>{deal.title}</h2>
          <p>{formatMoney(deal.value, deal.currency)}</p>
        </div>
        <div className="contact-tags">
          <Badge tone={TONO[deal.status]}>{ESTADO_NEGOCIO[deal.status]}</Badge>
          <Badge tone="neutral">{deal.stage.name}</Badge>
        </div>
        <DealActions deal={deal} {...options} />
      </section>
      <div className="contact-detail-grid">
        <div className="contact-detail-main">
          <DealItems dealId={deal.id} items={deal.items} locked={deal.status === "WON"} />
          <DealTimeline deal={deal} />
        </div>
        <div className="contact-detail-main">
          <Card className="contact-data-card">
            <h3>{NEGOCIO.datos}</h3>
            <dl>
              <Info
                icon={<UserRound />}
                label={campos.contacto}
                value={
                  deal.contact && (
                    <Link href={"/contactos/" + deal.contact.id}>
                      {deal.contact.firstName} {deal.contact.lastName}
                    </Link>
                  )
                }
              />
              <Info
                icon={<Building2 />}
                label={campos.empresa}
                value={deal.company && <Link href={"/empresas/" + deal.company.id}>{deal.company.name}</Link>}
              />
              <Info icon={<Mail />} label={campos.correo} value={deal.contact?.email ?? deal.company?.email} />
              <Info icon={<Phone />} label={campos.telefono} value={contactPhone && formatPhone(contactPhone)} />
              <Info icon={<UserRound />} label={campos.responsable} value={deal.owner?.name} />
              <Info icon={<Workflow />} label={campos.pipeline} value={deal.pipeline.name + " · " + deal.stage.name} />
              <Info icon={<CalendarDays />} label={campos.cierreEstimado} value={deal.expectedClose && formatDay(deal.expectedClose)} />
              <Info icon={<Clock3 />} label={campos.creado} value={formatDateTime(deal.createdAt)} />
            </dl>
          </Card>
          {deal.status !== "OPEN" && (
            <Card className="contact-data-card">
              <h3>{cierre.titulo}</h3>
              <dl>
                <Info
                  icon={<CalendarCheck />}
                  label={deal.status === "WON" ? cierre.ganadoEl : cierre.perdidoEl}
                  value={deal.closedAt && formatDay(deal.closedAt)}
                />
                {deal.status === "WON" && quote && (
                  <Info
                    icon={<FileText />}
                    label={cierre.cotizacion}
                    value={`${quote.number} · ${ESTADO_COTIZACION[quote.status]} · ${formatMoney(quote.total)}`}
                  />
                )}
                {deal.status === "LOST" && deal.lossReason && (
                  <>
                    <Info icon={<FileText />} label={cierre.motivo} value={MOTIVO_PERDIDA[deal.lossReason]} />
                    <Info icon={<FileText />} label={cierre.detalle} value={deal.lossDetail} />
                  </>
                )}
              </dl>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
