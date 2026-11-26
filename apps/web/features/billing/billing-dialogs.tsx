"use client";
import { useState, useTransition, type FormEvent } from "react";
import { PAYMENT_METHODS, type BuyerParty } from "@wave/shared";
import { Field } from "@/components/form/form-field";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { FORMA_PAGO } from "@/content/catalogos";
import { FACTURACION } from "@/content/facturacion";
import { emailBillingAction, reissueBillingAction, sendBillingAction } from "./actions";
import type { BillingInfo, BillingResult, HandoffView } from "./types";

const texto = FACTURACION;
export type BillingMode = "send" | "reissue" | "email";
type Props = Readonly<{
  mode: BillingMode;
  dealId: string;
  handoff: HandoffView | null;
  buyer: NonNullable<BillingInfo["buyer"]>;
  /** Nombre de la empresa y del contacto del negocio, para decir a quién se factura. */
  names: Record<BuyerParty, string | undefined>;
  onCancel: () => void;
  onDone: (handoff: HandoffView, message: string) => void;
}>;

/** Enviar/Reintentar, Reemitir y Reenviar: el mismo diálogo con los campos de cada caso. El botón queda deshabilitado mientras envía (doble clic). */
export function BillingDialog({ mode, dealId, handoff, buyer, names, onCancel, onDone }: Props) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const title = mode === "send" ? (handoff ? texto.dialogo.reintentar : texto.dialogo.enviar) : texto.dialogo[mode === "email" ? "reenviar" : "reemitir"];
  const submitLabel = { send: handoff ? texto.acciones.reintentar : texto.acciones.enviar, reissue: texto.acciones.reemitir, email: texto.acciones.reenviar }[mode];
  const run = { send: sendBillingAction, reissue: reissueBillingAction, email: emailBillingAction }[mode];
  const done = { send: texto.resultado.enviada, reissue: texto.resultado.reemitida, email: texto.resultado.reenviada }[mode];
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      setError("");
      const result: BillingResult = await run(dealId, form);
      if (result.handoff) onDone(result.handoff, done);
      else setError(result.error ?? texto.errorCarga);
    });
  };
  const [first] = buyer.options;
  return (
    <form className="deal-inspector transition-dialog" onSubmit={submit} aria-busy={pending}>
      <h2>{title}</h2>
      {mode !== "email" &&
        (buyer.options.length > 1 ? (
          <fieldset className="transition-followup billing-buyers">
            <legend>{texto.dialogo.facturarA}</legend>
            {buyer.options.map((party) => (
              <label key={party}>
                <input type="radio" name="buyer" value={party} defaultChecked={party === buyer.default} />
                {texto.comprador[party]}
                {names[party] && `: ${names[party]}`}
              </label>
            ))}
          </fieldset>
        ) : (
          <>
            <input type="hidden" name="buyer" value={first} />
            <p>
              {texto.dialogo.facturarAUnico}: {first && (names[first] ?? texto.comprador[first])}
            </p>
          </>
        ))}
      {mode === "send" && (
        <Field id="billing-paymentMethod" label={texto.dialogo.formaPago} required>
          <Select id="billing-paymentMethod" name="paymentMethod" defaultValue={handoff?.paymentMethod ?? PAYMENT_METHODS[0]}>
            {PAYMENT_METHODS.map((code) => (
              <option key={code} value={code}>
                {FORMA_PAGO[code]}
              </option>
            ))}
          </Select>
        </Field>
      )}
      {mode === "reissue" && <p>{texto.dialogo.avisoReemitir}</p>}
      {mode === "email" && (
        <>
          <Field id="billing-email" label={texto.dialogo.correo} icon="correo">
            <Input id="billing-email" name="email" type="email" maxLength={254} defaultValue={handoff?.buyer.email ?? ""} />
          </Field>
          <p className="field-hint">{texto.dialogo.correoAyuda}</p>
        </>
      )}
      {error && <Alert tone="error">{error}</Alert>}
      <div className="deal-confirm-actions">
        <Button variant="secondary" type="button" disabled={pending} onClick={onCancel}>
          {texto.acciones.cancelar}
        </Button>
        <Button type="submit" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
