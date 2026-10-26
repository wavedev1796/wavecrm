"use client";
import { Fragment, useState, useTransition, type FormEvent } from "react";
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
import type { DealDetail } from "./types";

const texto = NEGOCIO.propuestas;
type Result = { error?: string };

/** Propuestas del negocio: se registran enviadas con los productos actuales y se aceptan con su evidencia. */
export function DealQuotes({ deal, locked }: Readonly<{ deal: DealDetail; locked: boolean }>) {
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const sent = deal.quotes.find((quote) => quote.status === "SENT");
  const today = todayEcuador();
  const run = (action: (form: FormData) => Promise<Result>, success: string) => (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      setFeedback(null);
      const result = await action(form);
      setFeedback(result.error ? { tone: "error", message: result.error } : { tone: "success", message: success });
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
              {[texto.numero, texto.estado, texto.total, texto.enviada, texto.vigencia, texto.aceptada, texto.evidencia].map(
                (label) => (
                  <th key={label}>{label}</th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {deal.quotes.map((quote) => (
              <Fragment key={quote.id}>
                <tr>
                  <td>{quote.number}</td>
                  <td>{ESTADO_COTIZACION[quote.status]}</td>
                  <td className="deal-items-money">{formatMoney(quote.total)}</td>
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
                              <span>{texto.linea(line.quantity, line.description)}</span>
                              <small>{texto.lineaPrecio(formatMoney(line.unitPrice), line.taxRate)}</small>
                              <b className="deal-items-money">{formatMoney(lineTotal(line))}</b>
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
      {!locked && <p className="field-hint">{texto.ayuda}</p>}
      {!locked && sent && (
        <form
          className="deal-quote-form"
          noValidate
          aria-busy={pending}
          onSubmit={run((form) => acceptQuoteAction(deal.id, sent.id, form), texto.aceptadaOk)}
        >
          <h4>{texto.aceptarTitulo(sent.number)}</h4>
          <Field id="quote-acceptedAt" label={texto.aceptadaEl} required>
            <Input id="quote-acceptedAt" name="acceptedAt" type="date" max={today} defaultValue={today} required />
          </Field>
          <Field id="quote-acceptanceNote" label={texto.evidenciaLabel} required>
            <textarea id="quote-acceptanceNote" name="acceptanceNote" className="input deal-textarea" maxLength={500} required />
          </Field>
          <Button type="submit" loading={pending}>
            {texto.aceptar}
          </Button>
        </form>
      )}
      {!locked &&
        (deal.items.length ? (
          <form
            className="deal-quote-form"
            noValidate
            aria-busy={pending}
            onSubmit={run((form) => createQuoteAction(deal.id, form), texto.registrada)}
          >
            <h4>{texto.registrarTitulo}</h4>
            <Field id="quote-validUntil" label={texto.vigenteHasta} required>
              <Input id="quote-validUntil" name="validUntil" type="date" min={today} required />
            </Field>
            <Field id="quote-sentAt" label={texto.enviadaEl}>
              <Input id="quote-sentAt" name="sentAt" type="date" max={today} defaultValue={today} />
            </Field>
            <Button type="submit" variant="secondary" loading={pending}>
              {texto.registrar}
            </Button>
          </form>
        ) : (
          <p>{texto.sinProductos}</p>
        ))}
    </Card>
  );
}
