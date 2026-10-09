"use client";
import { useEffect, useRef, useState, useTransition } from "react";
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
import { FormDialog } from "@/components/form-dialog";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import { PIPELINE } from "@/content/pipeline";
import { deleteDealAction, moveDealAction } from "./actions";
import { DealForm } from "./deal-form";
import { DealHistory } from "./deal-history";
import { PipelineSettings } from "./pipeline-settings";
import {
  STATUS_LABEL,
  type Board,
  type Deal,
  type Option,
  type Pipeline,
} from "./types";

type Props = Board & {
  pipelines: Pipeline[];
  contacts: Option[];
  companies: Option[];
  users: Option[];
};
type Editor =
  | { kind: "new"; stageId: string }
  | { kind: "edit" | "history" | "delete"; deal: Deal };
const closeDate = (value: string) =>
  new Intl.DateTimeFormat("es-EC", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value));

export function PipelineBoard({
  pipeline,
  stages,
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
  const [pending, startTransition] = useTransition();
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
  const deals = stages.flatMap((stage) => stage.deals);
  const total =
    deals.reduce((sum, deal) => sum + Math.round(Number(deal.value) * 100), 0) /
    100;
  const won =
    deals
      .filter((deal) => deal.status === "WON")
      .reduce((sum, deal) => sum + Math.round(Number(deal.value) * 100), 0) /
    100;
  function move(deal: Deal, stageId: string) {
    if (pending || deal.stageId === stageId) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await moveDealAction(deal.id, stageId);
      setFeedback(
        result.error
          ? { tone: "error", message: result.error }
          : {
              tone: "success",
              message:
                deal.title +
                " se movio a " +
                stages.find((s) => s.id === stageId)?.name +
                ".",
            },
      );
      if (!result.error) router.refresh();
    });
  }
  const editorTitles = {
    new: "Crear nuevo negocio",
    edit: "Editar negocio",
    history: "Historial del negocio",
    delete: "Eliminar negocio",
  };
  const title = editorTitles[editor?.kind ?? "delete"];
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
              router.push(
                "/pipeline?pipelineId=" +
                  encodeURIComponent(event.target.value),
              )
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
            onClick={() =>
              setEditor({ kind: "new", stageId: stages[0]?.id ?? "" })
            }
          >
            <Plus aria-hidden />
            {PIPELINE.newDeal}
          </Button>
        </div>
      </section>
      {feedback && <Alert tone={feedback.tone}>{feedback.message}</Alert>}
      <section className="kpi-grid" aria-label="Resumen comercial">
        <Card className="kpi-card">
          <span>Negocios abiertos</span>
          <strong>
            {deals.filter((deal) => deal.status === "OPEN").length}
          </strong>
          <small>
            {deals.length} {deals.length === 1 ? "negocio" : "negocios"} en este
            pipeline
          </small>
        </Card>
        <Card className="kpi-card">
          <span>Valor del pipeline</span>
          <strong>{formatMoney(total)}</strong>
          <small>Todos los montos en USD</small>
        </Card>
        <Card className="kpi-card kpi-card--accent">
          <span>Valor ganado</span>
          <strong>{formatMoney(won)}</strong>
          <small>
            {deals.filter((deal) => deal.status === "WON").length} negocios
            ganados
          </small>
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
      <section
        className="pipeline-board pipeline-board--live"
        aria-label="Tablero del pipeline"
        aria-busy={pending}
      >
        {stages.map((stage) => (
          <section
            key={stage.id}
            className={
              "pipeline-column" +
              (over === stage.id ? " pipeline-column--over" : "")
            }
            aria-label={"Etapa " + stage.name}
            onDragOver={(event) => {
              if (dragged && !pending) {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
                setOver(stage.id);
              }
            }}
            onDragLeave={(event) => {
              if (
                !event.currentTarget.contains(
                  event.relatedTarget as Node | null,
                )
              )
                setOver(null);
            }}
            onDrop={(event) => {
              event.preventDefault();
              const deal = deals.find((d) => d.id === dragged);
              setOver(null);
              setDragged(null);
              if (deal) move(deal, stage.id);
            }}
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
            <div className="pipeline-cards">
              {stage.deals.map((deal) => (
                <article
                  key={deal.id}
                  aria-label={"Negocio " + deal.title}
                  className={
                    "card deal-card" +
                    (dragged === deal.id ? " deal-card--dragging" : "")
                  }
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
                    <button
                      type="button"
                      className="deal-title"
                      onClick={() => setEditor({ kind: "edit", deal })}
                    >
                      {deal.title}
                    </button>
                    <GripVertical
                      aria-label="Arrastrar tarjeta"
                      className="deal-grip"
                    />
                  </div>
                  <p className="deal-company">
                    {deal.company?.name ?? "Sin empresa"}
                  </p>
                  <p className="deal-contact">
                    {deal.contact
                      ? deal.contact.firstName + " " + deal.contact.lastName
                      : "Sin contacto"}
                  </p>
                  <div className="deal-amount">
                    <b>{formatMoney(deal.value)}</b>
                    <span
                      className={
                        "deal-status deal-status--" + deal.status.toLowerCase()
                      }
                    >
                      {STATUS_LABEL[deal.status]}
                    </span>
                  </div>
                  <div className="deal-meta">
                    <span>
                      <UserRound aria-hidden />
                      {deal.owner?.name ?? "Sin responsable"}
                    </span>
                    <span>
                      <CalendarDays aria-hidden />
                      {deal.expectedClose
                        ? closeDate(deal.expectedClose)
                        : "Sin fecha de cierre"}
                    </span>
                  </div>
                  <div className="deal-card-bottom">
                    <label htmlFor={"stage-" + deal.id}>Mover a</label>
                    <Select
                      id={"stage-" + deal.id}
                      value={stage.id}
                      disabled={pending}
                      onChange={(event) => move(deal, event.target.value)}
                      aria-label={"Mover " + deal.title + " de etapa"}
                    >
                      {stages.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="deal-card-actions">
                    <Button
                      variant="ghost"
                      onClick={() => setEditor({ kind: "edit", deal })}
                    >
                      <Pencil aria-hidden />
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => setEditor({ kind: "history", deal })}
                    >
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
              ))}
            </div>
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
            key={
              editor.kind === "new" ? "new-" + editor.stageId : editor.deal.id
            }
            deal={editor.kind === "edit" ? editor.deal : undefined}
            pipelineId={pipeline.id}
            stageId={
              editor.kind === "new" ? editor.stageId : editor.deal.stageId
            }
            pipelines={pipelines}
            contacts={contacts}
            companies={companies}
            users={users}
            onCancel={close}
            onSaved={saved}
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
              Se eliminara <strong>{editor.deal.title}</strong> y sus registros
              asociados. Esta accion no se puede deshacer.
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
