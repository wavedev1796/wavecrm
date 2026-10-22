"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, RotateCcw, ThumbsDown, Trophy } from "lucide-react";
import { FormDialog } from "@/components/form/form-dialog";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { NEGOCIO, PIPELINE, TRANSICION } from "@/content/pipeline";
import { DealForm } from "./deal-form";
import { TransitionDialog } from "./transition-dialog";
import type { DealDetail, Option, Pipeline } from "./types";

type Mode = "WON" | "LOST" | "REOPEN" | "edit";
type Props = {
  deal: DealDetail;
  pipelines: Pipeline[];
  contacts: Option[];
  companies: Option[];
  users: Option[];
  /** Solo un ADMIN reabre o modifica un negocio cerrado. */
  canReopen: boolean;
};
const TITLES = {
  WON: NEGOCIO.ganar.titulo,
  LOST: NEGOCIO.perder.titulo,
  REOPEN: NEGOCIO.reabrir.titulo,
  edit: PIPELINE.editDeal,
} as const;

/** Ganar, perder y reabrir abren el mismo modal de transición que el tablero: las reglas son las del API. */
export function DealActions({ deal, canReopen, ...options }: Readonly<Props>) {
  const router = useRouter();
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
    router.refresh();
  };
  const acciones = NEGOCIO.acciones;
  const open = deal.status === "OPEN";
  return (
    <div className="deal-actions">
      {open && (
        <>
          <Button onClick={() => setMode("WON")}>
            <Trophy aria-hidden />
            {acciones.ganar}
          </Button>
          <Button variant="secondary" onClick={() => setMode("LOST")}>
            <ThumbsDown aria-hidden />
            {acciones.perder}
          </Button>
        </>
      )}
      {!open && canReopen && (
        <Button variant="secondary" onClick={() => setMode("REOPEN")}>
          <RotateCcw aria-hidden />
          {acciones.reabrir}
        </Button>
      )}
      {(open || canReopen) && (
        <Button variant="ghost" onClick={() => setMode("edit")}>
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
