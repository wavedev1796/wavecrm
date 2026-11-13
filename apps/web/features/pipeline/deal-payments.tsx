"use client";
import { useState, useTransition, type FormEvent } from "react";
import { Trash2, Wallet } from "lucide-react";
import { Field } from "@/components/form/form-field";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { invalidProps } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { NEGOCIO } from "@/content/pipeline";
import { formatDay, formatMoney } from "@/lib/format";
import { addPaymentAction, deletePaymentAction } from "./actions";
import { todayEcuador } from "./deal-validation";
import type { DealDetail } from "./types";

const texto = NEGOCIO.abonos;
type Errors = Partial<Record<"amount" | "paidAt" | "note", string>>;

/**
 * Abonos sin comprobante (P6): total a cobrar, abonado y saldo (los calcula el API), la lista y el alta.
 * Borrar es solo de un ADMIN; un rechazado no recibe abonos.
 */
export function DealPayments({ deal, canDelete }: Readonly<{ deal: DealDetail; canDelete: boolean }>) {
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, startTransition] = useTransition();
  const payments = deal.payments ?? [];
  const today = todayEcuador();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const element = event.currentTarget;
    const form = new FormData(element);
    startTransition(async () => {
      setFeedback(null);
      const result = await addPaymentAction(deal.id, form);
      setErrors(result.fieldErrors ?? {});
      if (result.error) setFeedback({ tone: "error", message: result.error });
      else if (!result.fieldErrors) {
        setFeedback({ tone: "success", message: texto.registrado });
        element.reset();
      }
    });
  };
  const remove = (id: string) => {
    if (!window.confirm(texto.confirmarBorrar)) return;
    startTransition(async () => {
      setFeedback(null);
      const result = await deletePaymentAction(deal.id, id);
      setFeedback(result.error ? { tone: "error", message: result.error } : { tone: "success", message: texto.borrado });
    });
  };
  return (
    <Card className="contact-data-card deal-payments">
      <h3>
        <Wallet aria-hidden />
        {texto.titulo} <Badge tone="blue">{payments.length}</Badge>
      </h3>
      {feedback && <Alert tone={feedback.tone}>{feedback.message}</Alert>}
      {deal.balance && (
        <>
          <dl className="deal-payments-summary">
            {[
              [texto.porCobrar, deal.balance.due],
              [texto.abonado, deal.balance.paid],
              [texto.saldo, deal.balance.pending],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{formatMoney(value ?? 0)}</dd>
              </div>
            ))}
          </dl>
          <p className="field-hint">{texto.porCobrarAyuda}</p>
        </>
      )}
      {payments.length ? (
        <ul className="deal-payments-list" aria-label={texto.lista}>
          {payments.map((payment) => (
            <li key={payment.id}>
              <div>
                <strong>{formatMoney(payment.amount)}</strong>
                <span>{texto.detalle(formatDay(payment.paidAt), payment.createdBy?.name ?? texto.sinAutor)}</span>
                {payment.note && <p>{payment.note}</p>}
              </div>
              {canDelete && (
                <Button
                  variant="ghost"
                  className="action-button action-button--delete"
                  aria-label={texto.borrar(formatMoney(payment.amount))}
                  title={texto.borrar(formatMoney(payment.amount))}
                  disabled={pending}
                  onClick={() => remove(payment.id)}
                >
                  <Trash2 aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p className="deal-payments-empty">{texto.vacio}</p>
      )}
      {deal.status === "REJECTED" ? (
        <p className="field-hint">{texto.bloqueado}</p>
      ) : (
        <form onSubmit={submit} noValidate aria-busy={pending} className="deal-payments-form">
          <Field id="payment-amount" label={texto.monto} required error={errors.amount} icon="dinero">
            <Input
              id="payment-amount"
              name="amount"
              inputMode="decimal"
              maxLength={16}
              placeholder="0,00"
              required
              {...invalidProps("payment-amount", errors.amount)}
            />
          </Field>
          <Field id="payment-paidAt" label={texto.fecha} required error={errors.paidAt} icon="fecha">
            <Input
              id="payment-paidAt"
              name="paidAt"
              type="date"
              max={today}
              defaultValue={today}
              required
              {...invalidProps("payment-paidAt", errors.paidAt)}
            />
          </Field>
          <Field id="payment-note" label={texto.nota} error={errors.note} icon="texto">
            <textarea
              id="payment-note"
              name="note"
              className="input deal-textarea"
              maxLength={500}
              {...invalidProps("payment-note", errors.note)}
            />
          </Field>
          <p className="field-hint">{texto.notaAyuda}</p>
          <Button type="submit" variant="secondary" loading={pending}>
            {texto.registrar}
          </Button>
        </form>
      )}
    </Card>
  );
}
