"use client";

import Link from "next/link";
import {
  BadgeCheck,
  BriefcaseBusiness,
  Building2,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  FileText,
  LayoutDashboard,
  Mail,
  Package,
  Phone,
  TriangleAlert,
  UserRound,
  Wallet,
} from "lucide-react";
import { useRef, useState, type KeyboardEvent } from "react";
import { Info } from "@/components/data/detail-info";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ESTADO_COTIZACION, ESTADO_NEGOCIO, MOTIVO_CIERRE } from "@/content/catalogos";
import { NEGOCIO, TABLERO } from "@/content/pipeline";
import { formatDateTime, formatDay, formatMoney } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { DealActions } from "./deal-actions";
import { DealPayments } from "./deal-payments";
import { DealPreparation } from "./deal-preparation";
import { DealQualification } from "./deal-qualification";
import { DealTimeline } from "./deal-timeline";
import { StageProgress } from "./stage-progress";
import type { DealDetail, Option, Pipeline } from "./types";
import type { Member, TimelineResult } from "../timeline/types";

type TabId = "summary" | "products" | "activity" | "qualification" | "payments";
type Options = { pipelines: Pipeline[]; contacts: Option[]; companies: Option[]; users: Option[] };
const tone = { OPEN: "neutral", WON: "success", LOST: "warning", REJECTED: "danger" } as const;
const text = NEGOCIO.secciones;

const TABS: { id: TabId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "summary", label: text.resumen, icon: LayoutDashboard },
  { id: "products", label: text.productos, icon: Package },
  { id: "activity", label: text.actividad, icon: Clock3 },
  { id: "qualification", label: text.calificacion, icon: ClipboardCheck },
  { id: "payments", label: text.abonos, icon: Wallet },
];

export function DealDetailTabs({
  deal,
  options,
  canReopen,
  timeline,
  members,
  defaultTaxRate,
}: Readonly<{ deal: DealDetail; options: Options; canReopen: boolean; timeline: TimelineResult; members: Member[]; defaultTaxRate: number }>) {
  const [active, setActive] = useState<TabId>("summary");
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const locked = deal.status !== "OPEN";
  const hasActions = deal.status === "OPEN" || deal.status === "LOST" || canReopen;
  const selectTab = (id: TabId) => setActive(id);
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === "ArrowRight" ? (index + 1) % TABS.length
      : event.key === "ArrowLeft" ? (index - 1 + TABS.length) % TABS.length
        : event.key === "Home" ? 0
          : event.key === "End" ? TABS.length - 1 : -1;
    if (next < 0) return;
    event.preventDefault();
    const tab = TABS[next];
    if (!tab) return;
    selectTab(tab.id);
    tabRefs.current[next]?.focus();
  };

  const quote = deal.quotes[0];
  const customer = deal.company?.name ?? [deal.contact?.firstName, deal.contact?.lastName].filter(Boolean).join(" ");

  return (
    <div className="deal-detail-layout">
      <section className="deal-profile card" aria-label={deal.title}>
        <span className="avatar contact-profile-avatar"><BriefcaseBusiness aria-hidden /></span>
        <div className="deal-profile-main">
          <span>{NEGOCIO.etiqueta}{customer ? ` · ${customer}` : ""}</span>
          <h1>{deal.title}</h1>
          <StageProgress
            stages={options.pipelines.find((pipeline) => pipeline.id === deal.pipelineId)?.stages ?? [deal.stage]}
            currentId={deal.stageId}
          />
        </div>
        <div className="deal-profile-value-box">
          <span>{text.valorNegocio}</span>
          <strong>{formatMoney(deal.value, deal.currency)}</strong>
        </div>
        <div className="deal-profile-footer">
          <div className="contact-tags">
            <Badge tone={tone[deal.status]}>{ESTADO_NEGOCIO[deal.status]}</Badge>
            <Badge tone="neutral"><i className="deal-stage-dot" style={{ background: deal.stage.color ?? "var(--wave-blue)" }} aria-hidden />{deal.stage.name}</Badge>
            {deal.atRisk && <Badge tone="warning"><TriangleAlert aria-hidden className="deal-risk-icon" />{TABLERO.enRiesgo} · {TABLERO.sinActividad(deal.idleDays ?? 0)}</Badge>}
          </div>
          {hasActions && (
            <details className="deal-action-menu">
              <summary aria-label={text.abrirAcciones}><ChevronDown aria-hidden />{text.acciones}</summary>
              <DealActions deal={deal} {...options} canReopen={canReopen} />
            </details>
          )}
        </div>
      </section>

      <nav className="deal-tabs" role="tablist" aria-label={text.navegacion}>
        {TABS.map(({ id, label, icon: Icon }, index) => (
          <button
            key={id}
            ref={(node) => { tabRefs.current[index] = node; }}
            id={`deal-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={active === id}
            aria-controls={`deal-panel-${id}`}
            tabIndex={active === id ? 0 : -1}
            className={`deal-tab${active === id ? " is-active" : ""}`}
            onClick={() => selectTab(id)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            <Icon aria-hidden />{label}
            {id === "products" && <span className="deal-tab-count">{deal.items.length}</span>}
            {id === "payments" && (deal.payments?.length ?? 0) > 0 && <span className="deal-tab-count">{deal.payments?.length}</span>}
          </button>
        ))}
      </nav>

      <section id="deal-panel-summary" role="tabpanel" aria-labelledby="deal-tab-summary" className="deal-tab-panel" tabIndex={0} hidden={active !== "summary"}>
          <DealOverview
            deal={deal}
            quote={quote}
            timeline={timeline}
            onSelect={selectTab}
          />
      </section>
      <section id="deal-panel-products" role="tabpanel" aria-labelledby="deal-tab-products" className="deal-tab-panel" tabIndex={0} hidden={active !== "products"}>
        <DealPreparation deal={deal} locked={locked} defaultTaxRate={defaultTaxRate} />
      </section>
      <section id="deal-panel-activity" role="tabpanel" aria-labelledby="deal-tab-activity" className="deal-tab-panel" tabIndex={0} hidden={active !== "activity"}>
        <DealTimeline deal={deal} timeline={timeline} members={members} />
      </section>
      <section id="deal-panel-qualification" role="tabpanel" aria-labelledby="deal-tab-qualification" className="deal-tab-panel" tabIndex={0} hidden={active !== "qualification"}>
        <DealQualification key={deal.status} deal={deal} locked={locked} />
      </section>
      <section id="deal-panel-payments" role="tabpanel" aria-labelledby="deal-tab-payments" className="deal-tab-panel" tabIndex={0} hidden={active !== "payments"}>
        <DealPayments deal={deal} canDelete={canReopen} />
      </section>

    </div>
  );
}

function DealOverview({
  deal,
  quote,
  timeline,
  onSelect,
}: Readonly<{ deal: DealDetail; quote?: DealDetail["quotes"][number]; timeline: TimelineResult; onSelect: (tab: TabId) => void }>) {
  const fields = NEGOCIO.campos;
  const close = NEGOCIO.cierre;
  const acceptedQuote = deal.quotes.find((item) => item.status === "ACCEPTED");
  const contactPhone = deal.contact?.phone ?? deal.company?.phone;
  const events = "entries" in timeline ? timeline.entries.slice(0, 3) : [];

  return (
    <div className="deal-overview-grid">
      <div className="deal-overview-top">
        <Card className="contact-related deal-overview-quote">
          <header className="deal-overview-card-heading"><h2><FileText aria-hidden />{text.ultimaPropuesta}</h2>
            {quote && <Badge tone={quote.status === "ACCEPTED" ? "success" : quote.status === "REJECTED" ? "danger" : quote.status === "SUPERSEDED" ? "neutral" : "blue"}>{ESTADO_COTIZACION[quote.status]}</Badge>}
          </header>
          {quote ? (
            <>
              <div className="deal-overview-quote-line">
                <strong>{quote.number}{quote.version ? ` · v${quote.version}` : ""}</strong>
                <b>{formatMoney(quote.total)}</b>
              </div>
              <p>{NEGOCIO.propuestas.vigencia}: {quote.validUntil ? formatDay(quote.validUntil) : "—"}</p>
            </>
          ) : <p>{text.sinPropuesta}</p>}
          <Button type="button" variant="secondary" onClick={() => onSelect("products")}>
            {quote ? <Package aria-hidden /> : <FileText aria-hidden />}{quote ? text.verProductos : NEGOCIO.propuestas.preparar}
          </Button>
        </Card>

        <Card className="contact-data-card deal-overview-business">
          <h2><BriefcaseBusiness aria-hidden />{text.datosContacto}</h2>
          <dl>
            <Info icon={<Building2 />} label={fields.empresa} value={deal.company && <Link href={`/empresas/${deal.company.id}`}>{deal.company.name}</Link>} />
            <Info icon={<UserRound />} label={fields.contacto} value={deal.contact && <Link href={`/contactos/${deal.contact.id}`}>{deal.contact.firstName} {deal.contact.lastName}</Link>} />
            <Info icon={<Mail />} label={fields.correo} value={deal.contact?.email ?? deal.company?.email} />
            <Info icon={<Phone />} label={fields.telefono} value={contactPhone && formatPhone(contactPhone)} />
            <Info icon={<UserRound />} label={fields.responsable} value={deal.owner?.name} />
            <Info icon={<CalendarDays />} label={fields.cierreEstimado} value={deal.expectedClose && formatDay(deal.expectedClose)} />
          </dl>
          {(deal.status !== "OPEN") && (
            <div className="deal-overview-closed">
              <h3><CalendarCheck aria-hidden />{close.titulo}</h3>
              <dl>
                <Info icon={<CalendarDays />} label={{ WON: close.ganadoEl, LOST: close.perdidoEl, REJECTED: close.rechazadoEl }[deal.status]} value={deal.closedAt && formatDay(deal.closedAt)} />
                {deal.status === "WON" && acceptedQuote && <Info icon={<FileText />} label={close.cotizacion} value={`${acceptedQuote.number} · ${ESTADO_COTIZACION[acceptedQuote.status]} · ${formatMoney(acceptedQuote.total)}`} />}
                {deal.status !== "WON" && deal.lossReason && <Info icon={<BadgeCheck />} label={close.motivo} value={MOTIVO_CIERRE[deal.lossReason]} />}
                {deal.status !== "WON" && deal.lossDetail && <Info icon={<FileText />} label={close.detalle} value={deal.lossDetail} />}
              </dl>
            </div>
          )}
        </Card>

        <Card className="contact-data-card deal-overview-balance">
          <h2><Wallet aria-hidden />{text.saldoPendiente}</h2>
          {deal.balance ? (
            <dl>
              <div><dt>{NEGOCIO.abonos.abonado}</dt><dd>{formatMoney(deal.balance.paid)}</dd></div>
              <div><dt>{NEGOCIO.abonos.saldo}</dt><dd>{formatMoney(deal.balance.pending)}</dd></div>
            </dl>
          ) : <b>{formatMoney(deal.value, deal.currency)}</b>}
          <Button type="button" variant="ghost" onClick={() => onSelect("payments")}><Wallet aria-hidden />{text.verTodosAbonos}</Button>
        </Card>

      </div>

      <div className="deal-overview-bottom">
        <Card className="contact-data-card deal-overview-created">
          <h2><CalendarDays aria-hidden />{fields.pipeline}</h2>
          <p>{deal.pipeline.name} · {deal.stage.name}</p>
          <span className="field-hint">{fields.creado}: {formatDateTime(deal.createdAt)}</span>
        </Card>

        <Card className="contact-related deal-overview-activity">
          <header className="deal-overview-card-heading"><h2><Clock3 aria-hidden />{text.actividadReciente}</h2>
            <Button type="button" variant="ghost" onClick={() => onSelect("activity")}>{text.verActividad}</Button>
          </header>
          {"error" in timeline ? (
            <p className="field-hint">{timeline.error}</p>
          ) : events.length ? (
            <ol>
              {events.map((event) => <li key={event.id}><Badge tone="neutral">{event.type}</Badge><strong>{event.title}</strong><span>{event.detail}</span></li>)}
            </ol>
          ) : <p>{text.sinActividadReciente}</p>}
        </Card>
      </div>
    </div>
  );
}
