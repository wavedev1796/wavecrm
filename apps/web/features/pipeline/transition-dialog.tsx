"use client";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ACTIVITY_TYPES, LOSS_REASONS, REJECTION_REASONS, type TransitionCheck } from "@wave/shared";
import { Field } from "@/components/form/form-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { MOTIVO_CIERRE, TIPO_ACTIVIDAD } from "@/content/catalogos";
import { TRANSICION } from "@/content/pipeline";
import { completeTransitionAction, previewTransitionAction, saveTransitionAction } from "./actions";
import { todayEcuador } from "./deal-validation";
import type { Deal, Option, Preview } from "./types";

const texto = TRANSICION;
const campos = TRANSICION.campos;
const INTERACTIONS = ["CALL", "EMAIL", "MEETING"] as const;
/** Seguimiento de un perdido: por defecto, en tres meses. */
const FOLLOW_UP_DAYS = 90;
const inDays = (day: string, days: number) =>
  new Date(Date.parse(day + "T00:00:00.000Z") + days * 86_400_000).toISOString().slice(0, 10);

/** Lo que solo se completa en la ficha: productos para la propuesta, la propuesta enviada y su importe. */
function onlyInFicha(preview: Preview | null) {
  return Boolean(
    preview?.pending.some(
      ({ code }) =>
        code === "FINAL_AMOUNT" ||
        (code === "PROPOSAL_SENT" && !preview.items) ||
        (code === "ACCEPTANCE" && preview.quote?.status !== "SENT"),
    ),
  );
}

type Props = {
  deal: Pick<Deal, "id" | "title" | "stageId">;
  /** Id de etapa, WON, LOST, REJECTED o REOPEN. */
  to: string;
  targetName: string;
  contacts: Option[];
  users: Option[];
  onCancel: () => void;
  onDone: (message: string) => void;
};

/**
 * Modal único de cambio de etapa (arrastre, selector y botones de la ficha). Pregunta al API qué falta;
 * sin pendientes cambia directo, y con pendientes pide cada dato. Las reglas viven solo en el API.
 * Si falta algo que solo se completa en la ficha, guarda lo llenado y lleva a la ficha en vez de intentar mover.
 */
export function TransitionDialog({ deal, to, targetName, contacts, users, onCancel, onDone }: Readonly<Props>) {
  const router = useRouter();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const message = texto.hecho(deal.title, targetName);
  const href = "/pipeline/" + deal.id;
  const toFicha = onlyInFicha(preview);
  // StrictMode (desarrollo) monta el efecto dos veces: la segunda reutiliza la misma vista previa.
  const opening = useRef<ReturnType<typeof previewTransitionAction>>(null);

  useEffect(() => {
    let current = true;
    void (async () => {
      const result = await (opening.current ??= previewTransitionAction(deal.id, to));
      if (!current) return;
      if (!result.data) return setError(result.error ?? "");
      if (result.data.pending.length) return setPreview(result.data);
      const moved = await completeTransitionAction(deal.id, to, deal.stageId, new FormData());
      if (!current) return;
      if (moved.done) return onDone(message);
      setError(moved.error ?? "");
      const again = await previewTransitionAction(deal.id, to);
      if (current && again.data) setPreview(again.data);
    })();
    return () => {
      current = false;
    };
    // Solo al abrir: el modal se monta de nuevo para cada cambio pedido.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = (form: FormData) =>
    startTransition(async () => {
      setError("");
      if (toFicha) {
        const saved = await saveTransitionAction(deal.id, to, form);
        if (saved.error) return setError(saved.error);
        onCancel();
        return router.push(href);
      }
      const result = await completeTransitionAction(deal.id, to, deal.stageId, form);
      if (result.done) return onDone(message);
      setError(result.error ?? "");
      // Lo guardado antes del error ya cuenta: se vuelve a preguntar qué falta.
      const next = await previewTransitionAction(deal.id, to);
      if (next.data) setPreview(next.data);
    });

  const cancel = (
    <Button variant="secondary" type="button" disabled={pending} onClick={onCancel}>
      {texto.cancelar}
    </Button>
  );
  if (!preview)
    return (
      <div className="deal-inspector transition-dialog">
        <h2>{texto.titulo}</h2>
        {error ? <Alert tone="error">{error}</Alert> : <output>{texto.revisando}</output>}
        <div className="deal-confirm-actions">{cancel}</div>
      </div>
    );

  const today = todayEcuador();
  const field = (name: string, label: string, control: ReactNode, required = true) => (
    <Field id={"transition-" + name} label={label} required={required}>
      {control}
    </Field>
  );
  const text = (name: string, max: number) => (
    <textarea id={"transition-" + name} name={name} className="input deal-textarea" maxLength={max} />
  );
  const date = (name: string, limits: { min?: string; max?: string; defaultValue?: string }) => (
    <Input id={"transition-" + name} name={name} type="date" {...limits} />
  );
  const select = (name: string, options: readonly (readonly [string, string])[], empty = true) => (
    <Select id={"transition-" + name} name={name} defaultValue={empty ? "" : options[0]?.[0]}>
      {empty && <option value="">{campos.elegir}</option>}
      {options.map(([value, label]) => (
        <option key={value} value={value}>
          {label}
        </option>
      ))}
    </Select>
  );
  const named = (list: Option[]) => list.map((o) => [o.id, o.name] as const);
  const types = (codes: readonly (keyof typeof TIPO_ACTIVIDAD)[]) => codes.map((c) => [c, TIPO_ACTIVIDAD[c]] as const);
  const reasons = (codes: readonly (keyof typeof MOTIVO_CIERRE)[]) => codes.map((c) => [c, MOTIVO_CIERRE[c]] as const);

  const FIELDS: Record<TransitionCheck, () => ReactNode> = {
    CONTACT: () => field("contactId", campos.contacto, select("contactId", named(contacts))),
    OWNER: () => field("ownerId", campos.responsable, select("ownerId", named(users))),
    INTERACTION: () => (
      <>
        {field("interactionType", campos.tipoInteraccion, select("interactionType", types(INTERACTIONS), false))}
        {field("interactionSubject", campos.asuntoInteraccion, <Input id="transition-interactionSubject" name="interactionSubject" maxLength={160} />)}
        {field("interactionDay", campos.realizadaEl, date("interactionDay", { max: today, defaultValue: today }))}
      </>
    ),
    NEED: () => field("need", campos.necesidad, text("need", 2000)),
    NEXT_ACTIVITY: () => (
      <>
        {field("nextType", campos.tipoActividad, select("nextType", types(ACTIVITY_TYPES), false))}
        {field("nextSubject", campos.asuntoActividad, <Input id="transition-nextSubject" name="nextSubject" maxLength={160} />)}
        {field("nextDay", campos.programadaPara, date("nextDay", { min: today }))}
      </>
    ),
    SOLUTION: () => field("solution", campos.solucion, text("solution", 2000)),
    BUDGET: () => (
      <>
        {field("budget", campos.presupuesto, <Input id="transition-budget" name="budget" inputMode="decimal" maxLength={16} />, false)}
        {field("budgetNote", campos.justificacion, text("budgetNote", 1000), false)}
      </>
    ),
    EXPECTED_CLOSE: () => field("expectedClose", campos.cierreEstimado, date("expectedClose", { min: today })),
    // Sin productos o sin propuesta enviada se completa en la ficha (onlyInFicha): basta el mensaje del pendiente.
    PROPOSAL_SENT: () =>
      preview.items > 0 && (
        <>
          {field("validUntil", campos.vigencia, date("validUntil", { min: today }))}
          {field("sentAt", campos.enviadaEl, date("sentAt", { max: today, defaultValue: today }))}
        </>
      ),
    ACCEPTANCE: () =>
      preview.quote?.status === "SENT" && (
        <>
          <input type="hidden" name="quoteId" value={preview.quote.id} />
          {field("acceptedAt", campos.aceptadaEl, date("acceptedAt", { max: today, defaultValue: today }))}
          {field("acceptanceNote", campos.evidencia, text("acceptanceNote", 500))}
          <p className="field-hint">{campos.evidenciaAyuda}</p>
        </>
      ),
    FINAL_AMOUNT: () => null,
    CLOSED_AT: () => field("closedAt", campos.cierreReal, date("closedAt", { max: today, defaultValue: today })),
    LOSS_REASON: () => (
      <>
        {field("lossReason", campos.motivoPerdida, select("lossReason", reasons(LOSS_REASONS)))}
        {field("lossDetail", campos.detalle, text("lossDetail", 500), false)}
        <fieldset className="transition-followup">
          <legend>{campos.seguimiento}</legend>
          <p className="field-hint">{campos.seguimientoAyuda}</p>
          {field("followUpType", campos.tipoSeguimiento, select("followUpType", types(ACTIVITY_TYPES), false), false)}
          {field(
            "followUpSubject",
            campos.asuntoSeguimiento,
            <Input id="transition-followUpSubject" name="followUpSubject" maxLength={160} />,
            false,
          )}
          {field(
            "followUpDay",
            campos.fechaSeguimiento,
            date("followUpDay", { min: today, defaultValue: inDays(today, FOLLOW_UP_DAYS) }),
            false,
          )}
        </fieldset>
      </>
    ),
    REJECTION_REASON: () => (
      <>
        <Alert tone="note">{campos.avisoRechazo}</Alert>
        {field("lossReason", campos.motivoRechazo, select("lossReason", reasons(REJECTION_REASONS)))}
        {field("lossDetail", campos.detalle, text("lossDetail", 500), false)}
      </>
    ),
    REASON: () => field("reason", campos.motivo, text("reason", 500)),
  };

  return (
    <form
      className="deal-inspector transition-dialog"
      noValidate
      aria-busy={pending}
      onSubmit={(event) => {
        event.preventDefault();
        submit(new FormData(event.currentTarget));
      }}
    >
      <h2>{texto.titulo}</h2>
      <p>{texto.intro(deal.title, targetName)}</p>
      <Alert tone="note">
        {toFicha ? (
          texto.soloFicha
        ) : (
          <>
            {texto.recomendacion} <Link href={href}>{texto.abrirFicha}</Link>
          </>
        )}
      </Alert>
      {error && <Alert tone="error">{error}</Alert>}
      <ul className="transition-pending">
        {preview.pending.map((item) => (
          <li key={item.code}>
            <p>{item.message}</p>
            {FIELDS[item.code]()}
          </li>
        ))}
      </ul>
      <div className="deal-confirm-actions">
        {cancel}
        <Button type="submit" loading={pending}>
          {toFicha ? texto.irFicha : texto.confirmar}
        </Button>
      </div>
    </form>
  );
}
