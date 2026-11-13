"use client";
import {
  Fragment,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";
import { FileText } from "lucide-react";
import { Field } from "@/components/form/form-field";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table } from "@/components/ui/table";
import { ESTADO_COTIZACION } from "@/content/catalogos";
import { NEGOCIO } from "@/content/pipeline";
import { formatDay, formatMoney } from "@/lib/format";
import { acceptQuoteAction, createQuoteAction } from "./actions";
import { todayEcuador } from "./deal-validation";
import { lineTotal } from "./item-totals";
import { itemTotals } from "./item-totals";
import type { DealDetail } from "./types";

const texto = NEGOCIO.propuestas;
type Result = { error?: string };

/** Propuestas del negocio: se registran enviadas con los productos actuales y se aceptan con su evidencia. */
export function DealQuotes({
  deal,
  locked,
  hasUnsavedItems = false,
}: Readonly<{ deal: DealDetail; locked: boolean; hasUnsavedItems?: boolean }>) {
  const [feedback, setFeedback] = useState<{
    tone: "error" | "success";
    message: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const requestKey = useRef<string | null>(null);
  const sent = deal.quotes.find((quote) => quote.status === "SENT");
  const totals = itemTotals(deal.items);
  const customerName =
    deal.company?.name.trim() ||
    [deal.contact?.firstName, deal.contact?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
  const canPrepare =
    Boolean(customerName) && deal.items.length > 0 && !hasUnsavedItems;
  const today = todayEcuador();
  const run =
    (
      action: (form: FormData) => Promise<Result>,
      success: string,
      idempotent = false,
    ) =>
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      if (idempotent) {
        requestKey.current ??= crypto.randomUUID();
        form.set("requestKey", requestKey.current);
      }
      startTransition(async () => {
        setFeedback(null);
        const result = await action(form);
        setFeedback(
          result.error
            ? { tone: "error", message: result.error }
            : { tone: "success", message: success },
        );
        if (idempotent && !result.error) requestKey.current = null;
      });
    };
  const day = (value?: string | null) => (value ? formatDay(value) : "—");
  return (
    <Card className="contact-related deal-quotes">
      <h3>
        <FileText aria-hidden />
        {texto.titulo} <Badge tone="blue">{deal.quotes.length}</Badge>
      </h3>
      {feedback && <Alert tone={feedback.tone}>{feedback.message}</Alert>}
      {deal.quotes.length ? (
        <Table>
          <thead>
            <tr>
              {[
                texto.numero,
                texto.estado,
                texto.total,
                texto.enviada,
                texto.vigencia,
                texto.aceptada,
                texto.evidencia,
              ].map((label) => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {deal.quotes.map((quote) => (
              <Fragment key={quote.id}>
                <tr>
                  <td>
                    {quote.number}
                    {quote.version ? ` · v${quote.version}` : ""}
                  </td>
                  <td>{ESTADO_COTIZACION[quote.status]}</td>
                  <td className="deal-items-money">
                    {formatMoney(quote.total)}
                  </td>
                  <td>{day(quote.sentAt)}</td>
                  <td>{day(quote.validUntil)}</td>
                  <td>{day(quote.acceptedAt)}</td>
                  <td>{quote.acceptanceNote ?? "—"}</td>
                </tr>
                {/* La copia de los productos con que se envió: no cambia aunque después se editen. */}
                <tr className="deal-quote-lines">
                  <td colSpan={7}>
                    {quote.items?.length ? (
                      <details>
                        <summary>{texto.productos(quote.number)}</summary>
                        <ul>
                          {quote.items.map((line, index) => (
                            <li key={index}>
                              <span>
                                {texto.linea(line.quantity, line.description)}
                              </span>
                              <small>
                                {texto.lineaPrecio(
                                  formatMoney(line.unitPrice),
                                  line.taxRate,
                                  line.discountRate ?? 0,
                                )}
                              </small>
                              <b className="deal-items-money">
                                {formatMoney(lineTotal(line))}
                              </b>
                            </li>
                          ))}
                        </ul>
                      </details>
                    ) : (
                      <span className="field-hint">{texto.sinDetalle}</span>
                    )}
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </Table>
      ) : (
        <p>{texto.vacio}</p>
      )}
      {!locked && deal.quotes.length > 0 && (
        <Alert tone="note">{texto.versionInmutable}</Alert>
      )}
      {!locked && hasUnsavedItems && (
        <Alert tone="note">{texto.cambiosPendientes}</Alert>
      )}
      {!locked && sent && (
        <form
          className="deal-quote-form"
          noValidate
          aria-busy={pending}
          onSubmit={run(
            (form) => acceptQuoteAction(deal.id, sent.id, form),
            texto.aceptadaOk,
          )}
        >
          <h4>{texto.aceptarTitulo(sent.number)}</h4>
          <Field id="quote-acceptedAt" label={texto.aceptadaEl} required>
            <Input
              id="quote-acceptedAt"
              name="acceptedAt"
              type="date"
              max={today}
              defaultValue={today}
              required
            />
          </Field>
          <Field
            id="quote-acceptanceNote"
            label={texto.evidenciaLabel}
            required
          >
            <textarea
              id="quote-acceptanceNote"
              name="acceptanceNote"
              className="input deal-textarea"
              maxLength={500}
              required
            />
          </Field>
          <Button type="submit" loading={pending}>
            {texto.aceptar}
          </Button>
        </form>
      )}
      {!locked && (
        <>
          {!customerName && <Alert tone="error">{texto.sinCliente}</Alert>}
          {deal.items.length > 0 && customerName && (
            <form
              className="deal-quote-form"
              noValidate
              aria-busy={pending}
              onSubmit={run(
                (form) => createQuoteAction(deal.id, form),
                texto.registrada,
                true,
              )}
            >
              <h4>{texto.registrarTitulo}</h4>
              <section className="quote-preview" aria-label={texto.resumen}>
                <h5>{texto.resumen}</h5>
                <p>
                  <b>{texto.cliente}:</b> {customerName}
                </p>
                {deal.company?.taxId && (
                  <p>
                    <b>RUC:</b> {deal.company.taxId}
                  </p>
                )}
                <ul>
                  {deal.items.map((item) => (
                    <li key={item.id}>
                      <span>
                        {texto.linea(String(item.quantity), item.description)}
                      </span>
                      <small>
                        {texto.lineaPrecio(
                          formatMoney(item.unitPrice),
                          item.taxRate,
                          item.discountRate ?? 0,
                        )}
                      </small>
                      <b>{formatMoney(lineTotal(item))}</b>
                    </li>
                  ))}
                </ul>
                <dl className="deal-totals">
                  <dt>{texto.subtotal}</dt>
                  <dd>{formatMoney(totals.subtotal)}</dd>
                  <dt>{texto.impuesto}</dt>
                  <dd>{formatMoney(totals.tax)}</dd>
                  <dt>{texto.total}</dt>
                  <dd className="deal-total">{formatMoney(totals.total)}</dd>
                </dl>
              </section>
              <Field id="quote-validUntil" label={texto.vigenteHasta} required>
                <Input
                  id="quote-validUntil"
                  name="validUntil"
                  type="date"
                  min={today}
                  required
                />
              </Field>
              <Field id="quote-sentAt" label={texto.enviadaEl}>
                <Input
                  id="quote-sentAt"
                  name="sentAt"
                  type="date"
                  max={today}
                  defaultValue={today}
                />
              </Field>
              <Button
                type="submit"
                variant="secondary"
                loading={pending}
                disabled={!canPrepare}
              >
                {deal.quotes.length ? texto.crearVersion : texto.registrar}
              </Button>
            </form>
          )}
          {deal.items.length === 0 && <p>{texto.sinProductos}</p>}
        </>
      )}
    </Card>
  );
}
