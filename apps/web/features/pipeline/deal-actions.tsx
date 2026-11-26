"use client";
import { useEffect, useRef, useState } from "react";
import { Eraser, Pencil, ThumbsDown, Trophy, Undo2 } from "lucide-react";
import { FormDialog } from "@/components/form/form-dialog";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FACTURACION } from "@/content/facturacion";
import { NEGOCIO, PIPELINE, TRANSICION } from "@/content/pipeline";
import { BILLING_UNREACHABLE } from "@wave/shared";
import type { HandoffView } from "../billing/types";
import { DealForm } from "./deal-form";
import { TransitionDialog } from "./transition-dialog";
import type { DealDetail, Option, Pipeline } from "./types";

type Mode = "WON" | "LOST" | "REJECTED" | "REOPEN" | "edit";
type Props = {
  deal: DealDetail;
  pipelines: Pipeline[];
  contacts: Option[];
  companies: Option[];
  users: Option[];
  /** Solo un ADMIN reabre o modifica un negocio cerrado. */
  canReopen: boolean;
  /** Entrega a Wave Billing: con factura enviada, autorizada, en camino o de la que no se sabe, no se reversa (el API responde 409). */
  billingHandoff?: Pick<HandoffView, "status" | "messages"> | null;
};
const TITLES = {
  WON: NEGOCIO.ganar.titulo,
  LOST: NEGOCIO.perder.titulo,
  REJECTED: NEGOCIO.rechazar.titulo,
  REOPEN: NEGOCIO.reabrir.titulo,
  edit: PIPELINE.editDeal,
} as const;

/**
 * Ganar, perder, enmendar (rechazar) y reversar (reabrir) abren el mismo modal de transición que el tablero: las reglas son las del API.
 * Cualquiera rechaza un abierto o un perdido; reversar sigue siendo de ADMIN.
 */
export function DealActions({ deal, canReopen, billingHandoff, ...options }: Readonly<Props>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<Mode | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    if (mode && !dialog.current?.open) dialog.current?.showModal();
  }, [mode]);
  const close = () => {
    dialog.current?.close();
    setMode(null);
  };
  const done = (text: string) => {
    close();
    setMessage(text);
  };
  const acciones = NEGOCIO.acciones;
  const open = deal.status === "OPEN";
  const status = billingHandoff?.status;
  const blockReason =
    status === "SENT" || status === "AUTHORIZED" || status === "PENDING"
      ? FACTURACION.bloqueaReversar
      : status === "FAILED" && billingHandoff?.messages.includes(BILLING_UNREACHABLE)
        ? FACTURACION.bloqueaReversarSinSaber
        : null;
  return (
    <div className="deal-actions">
      {open && (
        <>
          <Button className="action-button action-button--success" onClick={() => setMode("WON")}>
            <Trophy aria-hidden />
            {acciones.ganar}
          </Button>
          <Button variant="secondary" className="action-button action-button--delete" onClick={() => setMode("LOST")}>
            <ThumbsDown aria-hidden />
            {acciones.perder}
          </Button>
        </>
      )}
      {(open || deal.status === "LOST") && (
        <Button variant="secondary" className="action-button action-button--cancel" onClick={() => setMode("REJECTED")}>
          <Eraser aria-hidden />
          {acciones.rechazar}
        </Button>
      )}
      {!open && canReopen && !blockReason && (
        <Button variant="secondary" className="action-button action-button--restore" onClick={() => setMode("REOPEN")}>
          <Undo2 aria-hidden />
          {acciones.reabrir}
        </Button>
      )}
      {!open && canReopen && blockReason && <p className="field-hint">{blockReason}</p>}
      {(open || canReopen) && (
        <Button variant="ghost" className="action-button action-button--edit" onClick={() => setMode("edit")}>
          <Pencil aria-hidden />
          {acciones.editar}
        </Button>
      )}
      {message && <Alert tone="success">{message}</Alert>}
      <FormDialog
        dialogRef={dialog}
        label={TITLES[mode ?? "edit"]}
        closeLabel={PIPELINE.close}
        onClose={() => setMode(null)}
      >
        {mode && mode !== "edit" && (
          <TransitionDialog
            key={mode}
            deal={deal}
            to={mode}
            targetName={TRANSICION.destinos[mode]}
            contacts={options.contacts}
            users={options.users}
            onCancel={close}
            onDone={done}
          />
        )}
        {mode === "edit" && (
          <DealForm
            deal={deal}
            pipelineId={deal.pipelineId}
            stageId={deal.stageId}
            {...options}
            onCancel={close}
            onSaved={done}
          />
        )}
      </FormDialog>
    </div>
  );
}
