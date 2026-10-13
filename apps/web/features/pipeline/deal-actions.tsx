"use client";
import { useEffect, useRef, useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Pencil, RotateCcw, ThumbsDown, Trophy } from "lucide-react";
import { LOSS_REASONS } from "@wave/shared";
import { FormDialog } from "@/components/form/form-dialog";
import { Field } from "@/components/form/form-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { invalidProps } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MOTIVO_PERDIDA } from "@/content/catalogos";
import { NEGOCIO, PIPELINE } from "@/content/pipeline";
import { formatMoney } from "@/lib/format";
import { loseDealAction, reopenDealAction, winDealAction } from "./actions";
import { DealForm } from "./deal-form";
import { itemTotals } from "./item-totals";
import type { DealDetail, Option, Pipeline } from "./types";

type Mode = "win" | "lose" | "reopen" | "edit";
type Done = (message: string) => void;
type Props = {
  deal: DealDetail;
  pipelines: Pipeline[];
  contacts: Option[];
  companies: Option[];
  users: Option[];
};
const TITLES = {
  win: NEGOCIO.ganar.titulo,
  lose: NEGOCIO.perder.titulo,
  reopen: NEGOCIO.reabrir.titulo,
  edit: PIPELINE.editDeal,
} as const;

export function DealActions({ deal, ...options }: Readonly<Props>) {
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
  const done: Done = (text) => {
    close();
    setMessage(text);
    router.refresh();
  };
  const acciones = NEGOCIO.acciones;
  return (
    <div className="deal-actions">
      {deal.status === "OPEN" ? (
        <>
          <Button onClick={() => setMode("win")}>
            <Trophy aria-hidden />
            {acciones.ganar}
          </Button>
          <Button variant="secondary" onClick={() => setMode("lose")}>
            <ThumbsDown aria-hidden />
            {acciones.perder}
          </Button>
        </>
      ) : (
        <Button variant="secondary" onClick={() => setMode("reopen")}>
          <RotateCcw aria-hidden />
          {acciones.reabrir}
        </Button>
      )}
      <Button variant="ghost" onClick={() => setMode("edit")}>
        <Pencil aria-hidden />
        {acciones.editar}
      </Button>
      {message && <Alert tone="success">{message}</Alert>}
      <FormDialog
        dialogRef={dialog}
        label={TITLES[mode ?? "edit"]}
        closeLabel={PIPELINE.close}
        onClose={() => setMode(null)}
      >
        {mode === "win" && <WinForm deal={deal} onCancel={close} onDone={done} />}
        {mode === "lose" && <LoseForm dealId={deal.id} onCancel={close} onDone={done} />}
        {mode === "reopen" && <ReopenConfirm deal={deal} onCancel={close} onDone={done} />}
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

function Footer({ pending, onCancel, label, disabled = false }: Readonly<{ pending: boolean; onCancel: () => void; label: string; disabled?: boolean }>) {
  return (
    <div className="deal-confirm-actions">
      <Button variant="secondary" type="button" disabled={pending} onClick={onCancel}>
        {PIPELINE.cancel}
      </Button>
      <Button type="submit" loading={pending} disabled={disabled}>
        {label}
      </Button>
    </div>
  );
}

function WinForm({ deal, onCancel, onDone }: Readonly<{ deal: DealDetail; onCancel: () => void; onDone: Done }>) {
  const texto = NEGOCIO.ganar;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Guayaquil" }).format(new Date()); // AAAA-MM-DD, día de Ecuador
  const [day, setDay] = useState(today);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await winDealAction(deal.id, day);
      if (result.error) setError(result.error);
      else onDone(texto.hecho);
    });
  };
  return (
    <form className="deal-inspector" onSubmit={submit} noValidate>
      <h2>{texto.titulo}</h2>
      {deal.items.length ? (
        <p>{texto.resumen(formatMoney(itemTotals(deal.items).total))}</p>
      ) : (
        <Alert tone="note">{texto.sinProductos}</Alert>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      <Field id="win-day" label={texto.fecha} required>
        <Input
          id="win-day"
          type="date"
          required
          max={today}
          value={day}
          onChange={(event) => setDay(event.target.value)}
        />
      </Field>
      <Footer pending={pending} onCancel={onCancel} label={texto.confirmar} disabled={!deal.items.length} />
    </form>
  );
}

function LoseForm({ dealId, onCancel, onDone }: Readonly<{ dealId: string; onCancel: () => void; onDone: Done }>) {
  const texto = NEGOCIO.perder;
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");
  const [errors, setErrors] = useState<{ lossReason?: string; lossDetail?: string; error?: string }>({});
  const [pending, startTransition] = useTransition();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await loseDealAction(dealId, reason, detail);
      if (result.fieldErrors || result.error)
        setErrors({ ...result.fieldErrors, error: result.error });
      else onDone(texto.hecho);
    });
  };
  return (
    <form className="deal-inspector" onSubmit={submit} noValidate>
      <h2>{texto.titulo}</h2>
      {errors.error && <Alert tone="error">{errors.error}</Alert>}
      <Field id="loss-reason" label={texto.motivo} required error={errors.lossReason}>
        <Select
          id="loss-reason"
          required
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          {...invalidProps("loss-reason", errors.lossReason)}
        >
          <option value="">{texto.elegir}</option>
          {LOSS_REASONS.map((code) => (
            <option key={code} value={code}>
              {MOTIVO_PERDIDA[code]}
            </option>
          ))}
        </Select>
      </Field>
      <Field id="loss-detail" label={texto.detalle} required={reason === "OTHER"} error={errors.lossDetail}>
        <textarea
          id="loss-detail"
          className="input deal-textarea"
          maxLength={500}
          value={detail}
          aria-describedby={errors.lossDetail ? "loss-detail-error" : "loss-detail-hint"}
          aria-invalid={errors.lossDetail ? true : undefined}
          onChange={(event) => setDetail(event.target.value)}
        />
        <p id="loss-detail-hint" className="field-hint">
          {texto.detalleAyuda}
        </p>
      </Field>
      <Footer pending={pending} onCancel={onCancel} label={texto.confirmar} />
    </form>
  );
}

function ReopenConfirm({ deal, onCancel, onDone }: Readonly<{ deal: DealDetail; onCancel: () => void; onDone: Done }>) {
  const texto = NEGOCIO.reabrir;
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const submit = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await reopenDealAction(deal.id);
      if (result.error) setError(result.error);
      else onDone(texto.hecho);
    });
  };
  return (
    <form className="deal-inspector" onSubmit={submit}>
      <h2>{texto.titulo}</h2>
      <p>{deal.status === "WON" ? texto.ganado : texto.perdido}</p>
      {error && <Alert tone="error">{error}</Alert>}
      <Footer pending={pending} onCancel={onCancel} label={texto.confirmar} />
    </form>
  );
}
