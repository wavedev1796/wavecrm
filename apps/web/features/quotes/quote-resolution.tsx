"use client";
import { useRef, useState, useTransition, type FormEvent, type RefObject } from "react";
import { BadgeCheck, Ban, X } from "lucide-react";
import { Field } from "@/components/form/form-field";
import { FormDialog } from "@/components/form/form-dialog";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LISTADO_COTIZACIONES as texto } from "@/content/cotizaciones";
import { acceptQuoteAction, rejectQuoteAction } from "../pipeline/actions";
import { todayEcuador } from "../pipeline/deal-validation";

type Action = (dealId: string, quoteId: string, form: FormData) => Promise<{ error?: string }>;
type Mode = {
  action: Action;
  title: (numero: string) => string;
  help: string;
  dateName: string;
  dateLabel: string;
  noteName: string;
  noteLabel: string;
  submit: string;
  icon: typeof BadgeCheck;
};

const MODES: Record<"accept" | "reject", Mode> = {
  accept: {
    action: acceptQuoteAction,
    title: texto.aceptarTitulo,
    help: texto.aceptarAyuda,
    dateName: "acceptedAt",
    dateLabel: texto.aceptadaEl,
    noteName: "acceptanceNote",
    noteLabel: texto.evidencia,
    submit: texto.confirmarAceptacion,
    icon: BadgeCheck,
  },
  reject: {
    action: rejectQuoteAction,
    title: texto.rechazarTitulo,
    help: texto.rechazarAyuda,
    dateName: "rejectedAt",
    dateLabel: texto.rechazadaEl,
    noteName: "rejectionNote",
    noteLabel: texto.motivo,
    submit: texto.confirmarRechazo,
    icon: Ban,
  },
};

/** Aceptar o rechazar una versión enviada desde el listado; el API repite todas las reglas de fecha y vigencia. */
export function QuoteResolution({ dealId, quoteId, number }: Readonly<{ dealId: string; quoteId: string; number: string }>) {
  const accept = useRef<HTMLDialogElement>(null);
  const reject = useRef<HTMLDialogElement>(null);
  // Botones de icono como las acciones por fila de Usuarios: la columna cabe sin desplazar la tabla.
  return (
    <div className="row-actions">
      <button type="button" className="icon-button icon-button--success" title={texto.aceptar(number)} onClick={() => accept.current?.showModal()}>
        <BadgeCheck aria-hidden />
        <span className="sr-only">{texto.aceptar(number)}</span>
      </button>
      <button type="button" className="icon-button icon-button--delete" title={texto.rechazar(number)} onClick={() => reject.current?.showModal()}>
        <Ban aria-hidden />
        <span className="sr-only">{texto.rechazar(number)}</span>
      </button>
      <ResolutionDialog dialog={accept} mode={MODES.accept} dealId={dealId} quoteId={quoteId} number={number} />
      <ResolutionDialog dialog={reject} mode={MODES.reject} dealId={dealId} quoteId={quoteId} number={number} />
    </div>
  );
}

function ResolutionDialog({
  dialog,
  mode,
  dealId,
  quoteId,
  number,
}: Readonly<{ dialog: RefObject<HTMLDialogElement | null>; mode: Mode; dealId: string; quoteId: string; number: string }>) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const today = todayEcuador();
  const id = (name: string) => `${quoteId}-${name}`;
  const Icon = mode.icon;

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      setError(null);
      const result = await mode.action(dealId, quoteId, form);
      if (result.error) return setError(result.error);
      // La acción revalida /cotizaciones: la fila llega con su nuevo estado y ya sin botones.
      dialog.current?.close();
    });
  };

  return (
    <FormDialog dialogRef={dialog} label={mode.title(number)} closeLabel={texto.cerrar} onClose={() => setError(null)}>
      <form className="deal-modal-form" noValidate aria-busy={pending} onSubmit={submit}>
        <header className="deal-dialog-header">
          <span className="field-hint">{texto.titulo}</span>
          <h2>{mode.title(number)}</h2>
          <p>{mode.help}</p>
        </header>
        {error && <Alert tone="error">{error}</Alert>}
        <div className="deal-modal-fields">
          <Field id={id(mode.dateName)} label={mode.dateLabel} required icon="fecha">
            <Input id={id(mode.dateName)} name={mode.dateName} type="date" max={today} defaultValue={today} required />
          </Field>
          <Field id={id(mode.noteName)} label={mode.noteLabel} required icon="evidencia">
            <textarea id={id(mode.noteName)} name={mode.noteName} className="input deal-textarea" maxLength={500} required />
          </Field>
        </div>
        <div className="deal-dialog-actions">
          <Button type="button" variant="ghost" disabled={pending} onClick={() => dialog.current?.close()}>
            <X aria-hidden />{texto.cancelar}
          </Button>
          <Button type="submit" loading={pending}><Icon aria-hidden />{mode.submit}</Button>
        </div>
      </form>
    </FormDialog>
  );
}
