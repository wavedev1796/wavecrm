"use client";
import { useRef, useState, useTransition, type FormEvent, type RefObject } from "react";
import { BadgeCheck, FilePlus2, FileText, Send, X } from "lucide-react";
import { Field } from "@/components/form/form-field";
import { FormDialog } from "@/components/form/form-dialog";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ESTADO_COTIZACION } from "@/content/catalogos";
import { NEGOCIO } from "@/content/pipeline";
import { formatDay, formatMoney } from "@/lib/format";
import { acceptQuoteAction, createQuoteAction } from "./actions";
import { todayEcuador } from "./deal-validation";
import { itemTotals, lineTotal } from "./item-totals";
import type { DealDetail } from "./types";

const texto = NEGOCIO.propuestas;
type Result = { error?: string };

/** Historial compacto; aceptación y creación de versión se abren en formularios separados. */
export function DealQuotes({
  deal,
  locked,
  hasUnsavedItems = false,
}: Readonly<{ deal: DealDetail; locked: boolean; hasUnsavedItems?: boolean }>) {
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const requestKey = useRef<string | null>(null);
  const createDialog = useRef<HTMLDialogElement>(null);
  const acceptDialog = useRef<HTMLDialogElement>(null);
  const sent = deal.quotes.find((quote) => quote.status === "SENT");
  const previewItems = deal.items.map((item) => ({ ...item, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) }));
  const totals = itemTotals(previewItems);
  const customerName = deal.company?.name.trim() || [deal.contact?.firstName, deal.contact?.lastName].filter(Boolean).join(" ").trim();
  const canPrepare = Boolean(customerName) && deal.items.length > 0 && !hasUnsavedItems;
  const today = todayEcuador();

  const run = (
    action: (form: FormData) => Promise<Result>,
    success: string,
    dialog: RefObject<HTMLDialogElement | null>,
    idempotent = false,
  ) => (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (idempotent) {
      requestKey.current ??= crypto.randomUUID();
      form.set("requestKey", requestKey.current);
    }
    startTransition(async () => {
      setFeedback(null);
      const result = await action(form);
      setFeedback(result.error ? { tone: "error", message: result.error } : { tone: "success", message: success });
      if (!result.error) {
        dialog.current?.close();
        if (idempotent) requestKey.current = null;
      }
    });
  };

  const day = (value?: string | null) => value ? formatDay(value) : "—";
  const quoteLineTotal = (line: { quantity: string; unitPrice: string; taxRate: number; discountRate?: number }) =>
    lineTotal({ ...line, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice) });

  return (
    <>
      <Card className="contact-related deal-quotes">
        <div className="deal-section-heading">
          <h3><FileText aria-hidden />{texto.titulo}<Badge tone="blue">{deal.quotes.length}</Badge></h3>
          {!locked && (
            <Button type="button" variant="secondary" disabled={!canPrepare} onClick={() => createDialog.current?.showModal()}>
              <FilePlus2 aria-hidden />{deal.quotes.length ? texto.crearVersion : texto.preparar}
            </Button>
          )}
        </div>
        {feedback?.tone === "success" && <Alert tone="success">{feedback.message}</Alert>}
        {hasUnsavedItems && <Alert tone="note">{texto.cambiosPendientes}</Alert>}
        {!locked && !customerName && <Alert tone="error">{texto.sinCliente}</Alert>}
        {deal.quotes.length ? (
          <div className="quote-history-list">
            {deal.quotes.map((quote) => (
              <article className="quote-history-card" key={quote.id}>
                <header className="quote-history-head">
                  <div className="quote-history-title">
                    <strong>{quote.number}{quote.version ? ` · v${quote.version}` : ""}</strong>
                    <Badge tone={quote.status === "ACCEPTED" ? "success" : quote.status === "REJECTED" ? "danger" : quote.status === "SUPERSEDED" ? "neutral" : "blue"}>
                      {ESTADO_COTIZACION[quote.status]}
                    </Badge>
                  </div>
                  <b className="quote-history-total">{formatMoney(quote.total)}</b>
                </header>
                <dl className="quote-history-meta">
                  <div><dt>{texto.enviada}</dt><dd>{day(quote.sentAt)}</dd></div>
                  <div><dt>{texto.vigencia}</dt><dd>{day(quote.validUntil)}</dd></div>
                  {quote.acceptedAt && <div><dt>{texto.aceptada}</dt><dd>{day(quote.acceptedAt)}</dd></div>}
                </dl>
                {quote.acceptanceNote && <p className="quote-history-evidence"><b>{texto.evidencia}:</b> {quote.acceptanceNote}</p>}
                {quote.items?.length ? (
                  <details className="quote-history-lines">
                    <summary>{texto.productos(quote.number)}</summary>
                    <ul>
                      {quote.items.map((line, index) => (
                        <li key={index}>
                          <span>{texto.linea(line.quantity, line.description)}</span>
                          <small>{texto.lineaPrecio(formatMoney(line.unitPrice), line.taxRate, line.discountRate ?? 0)}</small>
                          <b>{formatMoney(quoteLineTotal(line))}</b>
                        </li>
                      ))}
                    </ul>
                  </details>
                ) : (
                  <span className="field-hint">{texto.sinDetalle}</span>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="deal-items-empty">{texto.vacio}</p>
        )}
        {deal.quotes.length > 0 && (
          <p className="quote-version-note"><FileText aria-hidden />{texto.versionInmutable}</p>
        )}
        {!locked && deal.items.length === 0 && <p className="field-hint">{texto.sinProductos}</p>}
        {!locked && sent && (
          <div className="quote-next-action">
            <div>
              <span className="field-hint">{texto.aceptacionPendiente}</span>
              <strong>{texto.aceptarTitulo(sent.number)}</strong>
            </div>
            <Button type="button" variant="secondary" onClick={() => acceptDialog.current?.showModal()}>
              <BadgeCheck aria-hidden />{texto.registrarAceptacion}
            </Button>
          </div>
        )}
      </Card>

      <FormDialog dialogRef={createDialog} label={texto.dialogoTitulo} closeLabel={texto.cerrarDialogo}>
        <form
          className="deal-modal-form"
          noValidate
          aria-busy={pending}
          onSubmit={run((form) => createQuoteAction(deal.id, form), texto.registrada, createDialog, true)}
        >
          <header className="deal-dialog-header">
            <span className="field-hint">{texto.titulo}</span>
            <h2>{texto.dialogoTitulo}</h2>
            <p>{texto.dialogoAyuda}</p>
          </header>
          {feedback?.tone === "error" && <Alert tone="error">{feedback.message}</Alert>}
          <section className="quote-preview" aria-label={texto.resumen}>
            <h3>{texto.resumen}</h3>
            <p><b>{texto.cliente}:</b> {customerName}</p>
            {deal.company?.taxId && <p><b>RUC:</b> {deal.company.taxId}</p>}
            <ul>
              {previewItems.map((item) => (
                <li key={item.id}>
                  <span>{texto.linea(String(item.quantity), item.description)}</span>
                  <small>{texto.lineaPrecio(formatMoney(item.unitPrice), item.taxRate, item.discountRate ?? 0)}</small>
                  <b>{formatMoney(lineTotal(item))}</b>
                </li>
              ))}
            </ul>
            <dl className="deal-totals quote-preview-totals">
              <dt>{texto.subtotalVista}</dt><dd>{formatMoney(totals.subtotal)}</dd>
              <dt>{texto.impuestoVista}</dt><dd>{formatMoney(totals.tax)}</dd>
              <dt>{texto.total}</dt><dd className="deal-total">{formatMoney(totals.total)}</dd>
            </dl>
          </section>
          <div className="deal-modal-fields">
            <Field id="quote-validUntil" label={texto.vigenteHasta} required icon="fecha">
              <Input id="quote-validUntil" name="validUntil" type="date" min={today} required />
            </Field>
            <Field id="quote-sentAt" label={texto.enviadaEl} icon="fecha">
              <Input id="quote-sentAt" name="sentAt" type="date" max={today} defaultValue={today} />
            </Field>
          </div>
          <div className="deal-dialog-actions">
            <Button type="button" variant="ghost" disabled={pending} onClick={() => createDialog.current?.close()}>
              <X aria-hidden />{texto.cancelar}
            </Button>
            <Button type="submit" loading={pending} disabled={!canPrepare}>
              <Send aria-hidden />{texto.registrar}
            </Button>
          </div>
        </form>
      </FormDialog>

      <FormDialog dialogRef={acceptDialog} label={texto.aceptarTitulo(sent?.number ?? "")} closeLabel={texto.cerrarDialogo}>
        {sent && (
          <form
            className="deal-modal-form"
            noValidate
            aria-busy={pending}
            onSubmit={run((form) => acceptQuoteAction(deal.id, sent.id, form), texto.aceptadaOk, acceptDialog)}
          >
            <header className="deal-dialog-header">
              <span className="field-hint">{texto.titulo}</span>
              <h2>{texto.aceptarTitulo(sent.number)}</h2>
              <p>{texto.aceptacionAyuda}</p>
            </header>
            {feedback?.tone === "error" && <Alert tone="error">{feedback.message}</Alert>}
            <div className="deal-modal-fields">
              <Field id="quote-acceptedAt" label={texto.aceptadaEl} required icon="fecha">
                <Input id="quote-acceptedAt" name="acceptedAt" type="date" max={today} defaultValue={today} required />
              </Field>
              <Field id="quote-acceptanceNote" label={texto.evidenciaLabel} required icon="evidencia">
                <textarea id="quote-acceptanceNote" name="acceptanceNote" className="input deal-textarea" maxLength={500} required />
              </Field>
            </div>
            <div className="deal-dialog-actions">
              <Button type="button" variant="ghost" disabled={pending} onClick={() => acceptDialog.current?.close()}>
                <X aria-hidden />{texto.cancelar}
              </Button>
              <Button type="submit" loading={pending}><BadgeCheck aria-hidden />{texto.aceptar}</Button>
            </div>
          </form>
        )}
      </FormDialog>
    </>
  );
}
