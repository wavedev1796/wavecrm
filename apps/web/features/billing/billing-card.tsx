"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import { Download, FileText, Receipt } from "lucide-react";
import { FormDialog } from "@/components/form/form-dialog";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ESTADO_FACTURA, TIPO_IDENTIFICACION } from "@/content/catalogos";
import { FACTURACION } from "@/content/facturacion";
import { PIPELINE } from "@/content/pipeline";
import type { DealDetail } from "../pipeline/types";
import { refreshBillingAction } from "./actions";
import { BillingDialog, type BillingMode } from "./billing-dialogs";
import type { BillingLoad, BillingStatus } from "./types";

const texto = FACTURACION;
const tone = { PENDING: "neutral", FAILED: "danger", SENT: "blue", AUTHORIZED: "success", RETURNED: "warning", NOT_AUTHORIZED: "danger" } as const;
// Con clave de acceso hay comprobante en Billing: PDF y XML.
const DELIVERED: BillingStatus[] = ["SENT", "AUTHORIZED", "RETURNED", "NOT_AUTHORIZED"];
/** Mensaje de Billing: texto, o un objeto con `mensaje` (+ `informacionAdicional`); lo demás, tal cual en JSON. */
function line(message: unknown) {
  if (typeof message === "string") return message;
  const { mensaje, informacionAdicional } = (message ?? {}) as { mensaje?: unknown; informacionAdicional?: unknown };
  return typeof mensaje === "string" ? texto.mensajeDe(mensaje, typeof informacionAdicional === "string" ? informacionAdicional : "") : JSON.stringify(message);
}

/** Facturación del negocio ganado: estado de la entrega a Wave Billing y la acción que toca en cada estado. Si la carga falló, solo el error. */
export function BillingCard({ deal, load }: Readonly<{ deal: DealDetail; load: BillingLoad }>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<BillingMode | null>(null);
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (mode && !dialog.current?.open) dialog.current?.showModal();
  }, [mode]);
  const heading = (
    <h2>
      <Receipt aria-hidden />
      {texto.titulo}
    </h2>
  );
  if ("error" in load)
    return (
      <Card className="contact-data-card deal-overview-billing">
        <header>{heading}</header>
        <Alert tone="error">{load.error}</Alert>
      </Card>
    );

  // request() revalida la ficha: tras cada acción llegan props nuevas con la entrega al día.
  const { buyer, handoff } = load;
  // El correo no necesita comprador: sin él, el diálogo de correo no pregunta nada de «Facturar a».
  const dialogBuyer = buyer ?? { options: [], default: "COMPANY" as const };
  const status = handoff?.status;
  const close = () => {
    dialog.current?.close();
    setMode(null);
  };
  const done = (message: string) => {
    close();
    setFeedback({ tone: "success", message });
  };
  const refresh = () =>
    startTransition(async () => {
      setFeedback(null);
      const result = await refreshBillingAction(deal.id);
      if (result.handoff) done(texto.resultado.consultada);
      else setFeedback({ tone: "error", message: result.error ?? texto.errorCarga });
    });
  const open = (label: string, next: BillingMode) => (
    <Button type="button" variant={status === "AUTHORIZED" ? "secondary" : "primary"} onClick={() => setMode(next)}>
      {label}
    </Button>
  );
  const base = `/api/deals/${encodeURIComponent(deal.id)}/billing`;
  const title = mode ? texto.dialogo[({ send: handoff ? "reintentar" : "enviar", reissue: "reemitir", email: "reenviar" } as const)[mode]] : texto.titulo;
  const names = { COMPANY: deal.company?.name, CONTACT: [deal.contact?.firstName, deal.contact?.lastName].filter(Boolean).join(" ") || undefined };

  return (
    <Card className="contact-data-card deal-overview-billing">
      <header>
        {heading}
        {status && <Badge tone={tone[status]}>{ESTADO_FACTURA[status]}</Badge>}
      </header>
      {handoff && (
        <div className="billing-lines">
          <strong>{handoff.invoiceNumber ? texto.factura(handoff.invoiceNumber, handoff.quoteNumber) : texto.facturaPendiente(handoff.quoteNumber)}</strong>
          {handoff.buyer.razonSocial && <span>{texto.facturadoA(handoff.buyer.razonSocial, [TIPO_IDENTIFICACION[handoff.buyer.tipoIdentificacion ?? ""], handoff.buyer.identificacion].filter(Boolean).join(" "))}</span>}
          {handoff.authorizationNumber && <span>{texto.autorizacion(handoff.authorizationNumber)}</span>}
        </div>
      )}
      {handoff && handoff.status !== "AUTHORIZED" && handoff.messages.length > 0 && (
        <ul className="billing-messages" aria-label={texto.mensajes}>
          {handoff.messages.map((message, index) => (
            <li key={index}>{line(message)}</li>
          ))}
        </ul>
      )}
      {!handoff && <p className="billing-notice">{buyer ? texto.sinEnviar : texto.sinComprador}</p>}
      {feedback && <Alert tone={feedback.tone}>{feedback.message}</Alert>}
      <div className="billing-actions">
        {buyer && (!handoff || status === "FAILED" || status === "PENDING") && open(handoff ? texto.acciones.reintentar : texto.acciones.enviar, "send")}
        {status === "SENT" && (
          <Button type="button" loading={pending} onClick={refresh}>
            {texto.acciones.consultar}
          </Button>
        )}
        {buyer && (status === "RETURNED" || status === "NOT_AUTHORIZED") && open(texto.acciones.reemitir, "reissue")}
        {status === "AUTHORIZED" && open(texto.acciones.reenviar, "email")}
        {handoff?.accessKey && DELIVERED.includes(handoff.status) && (
          <>
            <a className="quote-history-pdf" href={`${base}/ride`} target="_blank" rel="noopener">
              <FileText aria-hidden />
              {texto.acciones.verPdf}
            </a>
            <a className="quote-history-pdf" href={`${base}/xml`} download>
              <Download aria-hidden />
              {texto.acciones.descargarXml}
            </a>
          </>
        )}
      </div>
      <FormDialog dialogRef={dialog} label={title} closeLabel={PIPELINE.close} onClose={() => setMode(null)}>
        {mode && <BillingDialog key={mode} mode={mode} title={title} dealId={deal.id} handoff={handoff} buyer={dialogBuyer} names={names} onCancel={close} onDone={done} />}
      </FormDialog>
    </Card>
  );
}
