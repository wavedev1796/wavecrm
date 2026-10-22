"use client";
import { useEffect, useRef, useState, useTransition, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  GripVertical,
  History,
  Pencil,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { FormDialog } from "@/components/form/form-dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { formatDay, formatMoney } from "@/lib/format";
import { ESTADO_NEGOCIO } from "@/content/catalogos";
import { PIPELINE, TABLERO } from "@/content/pipeline";
import { deleteDealAction, loadColumnAction } from "./actions";
import { DealForm } from "./deal-form";
import { DealHistory } from "./deal-history";
import { PipelineSettings } from "./pipeline-settings";
import { TransitionDialog } from "./transition-dialog";
import type { Board, Column, Deal, Option, Pipeline } from "./types";

type Props = Board & {
  pipelines: Pipeline[];
  contacts: Option[];
  companies: Option[];
  users: Option[];
};
type Editor =
  | { kind: "new"; stageId: string }
  | { kind: "edit" | "history" | "delete"; deal: Deal }
  | { kind: "transition"; deal: Deal; to: string; targetName: string };
/** Columna del estado Perdido: no es una etapa, así que usa este código en vez de un id. */
const LOST = "LOST";

export function PipelineBoard({
  pipeline,
  stages,
  lost,
  metrics,
  pipelines,
  contacts,
  companies,
  users,
}: Readonly<Props>) {
  const router = useRouter();
  const dialog = useRef<HTMLDialogElement>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [dragged, setDragged] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    tone: "error" | "success";
    message: string;
  } | null>(null);
  const [deleteError, setDeleteError] = useState("");
  // Páginas extra de "Ver más" por columna; un refresco trae de nuevo la primera página de cada una.
  const [more, setMore] = useState<Record<string, { page: number; deals: Deal[] }>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => setMore({}), [stages, lost]);
  useEffect(() => {
    if (editor && !dialog.current?.open) dialog.current?.showModal();
  }, [editor]);
  const close = () => {
    dialog.current?.close();
    setEditor(null);
    setDeleteError("");
  };
  const saved = (message: string) => {
    close();
    setFeedback({ tone: "success", message });
    router.refresh();
  };
  const columns: [string, Column][] = [
    ...stages.map((stage) => [stage.id, stage] as [string, Column]),
    [LOST, lost],
  ];
  const shown = (key: string, column: Column) => [...column.deals, ...(more[key]?.deals ?? [])];
  const deals = columns.flatMap(([key, column]) => shown(key, column));
  const targetName = (to: string) =>
    to === LOST ? TABLERO.perdido : (stages.find((s) => s.id === to)?.name ?? "");
  /** Arrastre y selector piden lo mismo: el modal pregunta al API qué falta antes de mover. */
  function requestMove(deal: Deal, to: string) {
    const current = deal.status === "LOST" ? LOST : deal.stageId;
    if (pending || to === current) return;
    setFeedback(null);
    setEditor({ kind: "transition", deal, to, targetName: targetName(to) });
  }
  function loadMore(key: string) {
    const page = (more[key]?.page ?? 1) + 1;
    setLoading(key);
    startTransition(async () => {
      const result = await loadColumnAction(pipeline.id, key, page);
      setLoading(null);
      if (result.error) setFeedback({ tone: "error", message: result.error });
      else
        setMore((current) => ({
          ...current,
          [key]: { page, deals: [...(current[key]?.deals ?? []), ...(result.data?.deals ?? [])] },
        }));
    });
  }
  const dropZone = (key: string) => ({
    onDragOver: (event: DragEvent) => {
      if (dragged && !pending) {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setOver(key);
      }
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOver(null);
    },
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      const deal = deals.find((d) => d.id === dragged);
      setOver(null);
      setDragged(null);
      if (deal) requestMove(deal, key);
    },
  });
  const card = (deal: Deal, key: string) => (
    <article
      key={deal.id}
      aria-label={"Negocio " + deal.title}
      className={"card deal-card" + (dragged === deal.id ? " deal-card--dragging" : "")}
      draggable={!pending}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", deal.id);
        event.dataTransfer.effectAllowed = "move";
        setDragged(deal.id);
      }}
      onDragEnd={() => {
        setDragged(null);
        setOver(null);
      }}
    >
      <div className="deal-card-heading">
        <Link className="deal-title" href={"/pipeline/" + deal.id}>
          {deal.title}
        </Link>
        <GripVertical aria-label="Arrastrar tarjeta" className="deal-grip" />
      </div>
      <p className="deal-company">{deal.company?.name ?? "Sin empresa"}</p>
      <p className="deal-contact">
        {deal.contact ? deal.contact.firstName + " " + deal.contact.lastName : "Sin contacto"}
      </p>
      <div className="deal-amount">
        <b>{formatMoney(deal.value)}</b>
        <span className={"deal-status deal-status--" + deal.status.toLowerCase()}>
          {ESTADO_NEGOCIO[deal.status]}
        </span>
      </div>
      <div className="deal-meta">
        <span>
          <UserRound aria-hidden />
          {deal.owner?.name ?? "Sin responsable"}
        </span>
        <span>
          <CalendarDays aria-hidden />
          {deal.expectedClose ? formatDay(deal.expectedClose) : "Sin fecha de cierre"}
        </span>
      </div>
      <div className="deal-card-bottom">
        <label htmlFor={"stage-" + deal.id}>Mover a</label>
        <Select
          id={"stage-" + deal.id}
          value={key}
          disabled={pending}
          onChange={(event) => requestMove(deal, event.target.value)}
          aria-label={"Mover " + deal.title + " de etapa"}
        >
          {stages.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
          <option value={LOST}>{TABLERO.perdido}</option>
        </Select>
      </div>
      <div className="deal-card-actions">
        <Button variant="ghost" onClick={() => setEditor({ kind: "edit", deal })}>
          <Pencil aria-hidden />
          Editar
        </Button>
        <Button variant="ghost" onClick={() => setEditor({ kind: "history", deal })}>
          <History aria-hidden />
          Historial
        </Button>
        <button
          type="button"
          className="icon-button"
          aria-label={"Eliminar " + deal.title}
          onClick={() => setEditor({ kind: "delete", deal })}
        >
          <Trash2 aria-hidden />
        </button>
      </div>
    </article>
  );
  const cards = (key: string, column: Column) => {
    const list = shown(key, column);
    const left = Number(column.count) - list.length;
    return (
      <>
        <div className="pipeline-cards">{list.map((deal) => card(deal, key))}</div>
        {left > 0 && (
          <button
            type="button"
            className="pipeline-more"
            disabled={pending}
            aria-busy={loading === key}
            onClick={() => loadMore(key)}
          >
            {loading === key ? TABLERO.cargandoMas : TABLERO.verMas(left)}
          </button>
        )}
      </>
    );
  };
  const editorTitles = {
    new: "Crear nuevo negocio",
    edit: "Editar negocio",
    history: "Historial del negocio",
    delete: "Eliminar negocio",
    transition: TABLERO.cambiarEtapa,
  };
  const title = editorTitles[editor?.kind ?? "delete"];
  const total = metrics.open.count + metrics.won.count + metrics.lost.count;
  return (
    <div className="pipeline-page">
      <section className="pipeline-toolbar">
        <div className="pipeline-picker">
          <label htmlFor="active-pipeline">Pipeline de ventas</label>
          <Select
            id="active-pipeline"
            value={pipeline.id}
            disabled={pending}
            onChange={(event) =>
              router.push("/pipeline?pipelineId=" + encodeURIComponent(event.target.value))
            }
          >
            {pipelines.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.isDefault ? " · Principal" : ""}
              </option>
            ))}
          </Select>
        </div>
        <div className="pipeline-toolbar-actions">
          <PipelineSettings pipelines={pipelines} pipelineId={pipeline.id} />
          <Button
            disabled={!stages.length || pending}
            onClick={() => setEditor({ kind: "new", stageId: stages[0]?.id ?? "" })}
          >
            <Plus aria-hidden />
            {PIPELINE.newDeal}
          </Button>
        </div>
      </section>
      {feedback && <Alert tone={feedback.tone}>{feedback.message}</Alert>}
      {/* Métricas del API (dealMetrics): una sola definición de abiertos, ganados y perdidos. */}
      <section className="kpi-grid" aria-label="Resumen comercial">
        <Card className="kpi-card">
          <span>{TABLERO.kpis.abiertos}</span>
          <strong>{metrics.open.count}</strong>
          <small>{TABLERO.total(total)}</small>
        </Card>
        <Card className="kpi-card">
          <span>{TABLERO.kpis.valorAbierto}</span>
          <strong>{formatMoney(metrics.open.value)}</strong>
          <small>{TABLERO.kpis.valorAbiertoAyuda}</small>
        </Card>
        <Card className="kpi-card kpi-card--accent">
          <span>{TABLERO.kpis.valorGanado}</span>
          <strong>{formatMoney(metrics.won.value)}</strong>
          <small>{TABLERO.ganados(metrics.won.count)}</small>
        </Card>
        <Card className="kpi-card">
          <span>{TABLERO.kpis.perdidos}</span>
          <strong>{metrics.lost.count}</strong>
          <small>{TABLERO.kpis.perdidosAyuda(formatMoney(metrics.lost.value))}</small>
        </Card>
      </section>
      <div className="pipeline-board-caption">
        <p>Arrastra una tarjeta o usa su selector para cambiar de etapa.</p>
        {pending && <output>Guardando cambio...</output>}
      </div>
      {!stages.length && (
        <Alert tone="note">
          Agrega una etapa en Configurar pipeline para crear tu primer negocio.
        </Alert>
      )}
      <section className="pipeline-board" aria-label="Tablero del pipeline" aria-busy={pending}>
        {stages.map((stage) => (
          <section
            key={stage.id}
            className={"pipeline-column" + (over === stage.id ? " pipeline-column--over" : "")}
            aria-label={"Etapa " + stage.name}
            {...dropZone(stage.id)}
          >
            <header>
              <h2>
                <i style={{ background: stage.color ?? "var(--wave-blue)" }} />
                {stage.name}
              </h2>
              <span>{stage.count}</span>
            </header>
            <div className="pipeline-stage-summary">
              <strong>{formatMoney(stage.value)}</strong>
              <span>{stage.probability}% probabilidad</span>
            </div>
            {cards(stage.id, stage)}
            {!stage.deals.length && (
              <div className="pipeline-stage-empty">
                <p>{PIPELINE.noDeals}</p>
                <span>Suelta aqui una tarjeta para avanzar.</span>
              </div>
            )}
            <button
              type="button"
              className="add-deal"
              disabled={pending}
              onClick={() => setEditor({ kind: "new", stageId: stage.id })}
            >
              <Plus aria-hidden />
              Crear negocio
            </button>
          </section>
        ))}
        {stages.length > 0 && (
          <section
            className={
              "pipeline-column pipeline-column--lost" + (over === LOST ? " pipeline-column--over" : "")
            }
            aria-label={TABLERO.columnaPerdido}
            {...dropZone(LOST)}
          >
            <header>
              <h2>
                <i className="pipeline-lost-dot" />
                {TABLERO.perdido}
              </h2>
              <span>{lost.count}</span>
            </header>
            <div className="pipeline-stage-summary">
              <strong>{formatMoney(lost.value)}</strong>
              <span>{TABLERO.perdidoAyuda}</span>
            </div>
            {cards(LOST, lost)}
            {!lost.deals.length && (
              <div className="pipeline-stage-empty">
                <span>{TABLERO.perdidoVacio}</span>
              </div>
            )}
          </section>
        )}
      </section>
      <FormDialog
        dialogRef={dialog}
        label={title}
        closeLabel={PIPELINE.close}
        onClose={() => {
          setEditor(null);
          setDeleteError("");
        }}
      >
        {editor && (editor.kind === "new" || editor.kind === "edit") && (
          <DealForm
            key={editor.kind === "new" ? "new-" + editor.stageId : editor.deal.id}
            deal={editor.kind === "edit" ? editor.deal : undefined}
            pipelineId={pipeline.id}
            stageId={editor.kind === "new" ? editor.stageId : editor.deal.stageId}
            pipelines={pipelines}
            contacts={contacts}
            companies={companies}
            users={users}
            onCancel={close}
            onSaved={saved}
          />
        )}
        {editor?.kind === "transition" && (
          <TransitionDialog
            key={editor.deal.id + ":" + editor.to}
            deal={editor.deal}
            to={editor.to}
            targetName={editor.targetName}
            contacts={contacts}
            users={users}
            onCancel={close}
            onDone={saved}
          />
        )}
        {editor?.kind === "history" && (
          <div className="deal-inspector">
            <h2>{editor.deal.title}</h2>
            <DealHistory id={editor.deal.id} />
            <Button variant="secondary" onClick={close}>
              Cerrar
            </Button>
          </div>
        )}
        {editor?.kind === "delete" && (
          <div className="deal-inspector">
            <h2>Eliminar negocio</h2>
            <p>
              Se eliminara <strong>{editor.deal.title}</strong> y sus registros asociados. Esta
              accion no se puede deshacer.
            </p>
            {deleteError && <Alert tone="error">{deleteError}</Alert>}
            <div className="deal-confirm-actions">
              <Button variant="secondary" disabled={pending} onClick={close}>
                Cancelar
              </Button>
              <Button
                loading={pending}
                onClick={() =>
                  startTransition(async () => {
                    const result = await deleteDealAction(editor.deal.id);
                    if (result.error) setDeleteError(result.error);
                    else saved(PIPELINE.deleted);
                  })
                }
              >
                Eliminar negocio
              </Button>
            </div>
          </div>
        )}
      </FormDialog>
    </div>
  );
}
