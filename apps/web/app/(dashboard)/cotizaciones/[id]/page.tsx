import Link from "next/link";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { ESTADO_COTIZACION } from "@/content/catalogos";
import { DOCUMENTO_COTIZACION as texto } from "@/content/cotizaciones";
import { authenticatedApi } from "@/lib/authenticated-api";
import { formatDay, formatMoney } from "@/lib/format";
import { lineTotal } from "../../../../features/pipeline/item-totals";
import type { Quote, QuoteLine } from "../../../../features/pipeline/types";
import { PrintButton } from "../../../../features/quotes/print-button";

type Party = { email: string | null; phone: string | null };
/** Lo que guardó el API al registrar la versión (CRM-27): el documento no lee datos vivos del negocio. */
type QuoteDocument = Omit<Quote, "items"> & {
  deal: { id: string; title: string };
  items: (QuoteLine & { product?: { code: string } | null })[];
  snapshot: {
    customer?: {
      company: (Party & { name: string; legalName: string | null; taxId: string | null; address: string | null; city: string | null }) | null;
      contact: (Party & { firstName: string; lastName: string; documentId: string | null; position: string | null }) | null;
    };
    issuer?: { name: string | null; email: string | null };
    deal?: { title: string; currency: string };
  };
};

const day = (value?: string | null) => (value ? formatDay(value) : "—");
const join = (...parts: (string | null | undefined)[]) => parts.filter(Boolean).join(" · ");

/** Documento de una versión registrada; el PDF sale del diálogo de impresión con `15-cotizacion.css`. */
export default async function QuotePage({ params }: Readonly<{ params: Promise<{ id: string }> }>) {
  const { id } = await params;
  // El API aplica el alcance (ADMIN todo, VENDEDOR solo sus negocios) y responde 404 a lo ajeno.
  const response = await authenticatedApi("/quotes/" + encodeURIComponent(id));
  if (response.status === 404) notFound();
  if (!response.ok)
    return (
      <div className="quote-document-page">
        <Link className="back-link" href="/pipeline">{texto.volverPipeline}</Link>
        <Alert tone="error">{texto.errorCarga}</Alert>
        <Link className="button button--secondary quote-document-retry" href={"/cotizaciones/" + encodeURIComponent(id)}>{texto.reintentar}</Link>
      </div>
    );
  const quote = (await response.json()) as QuoteDocument;
  const back = <Link className="back-link" href={"/pipeline/" + encodeURIComponent(quote.deal.id)}>{texto.volverNegocio}</Link>;
  const { customer, issuer, deal } = quote.snapshot;
  if (!customer || !quote.items.length)
    return (
      <div className="quote-document-page">
        {back}
        <Alert tone="note">{texto.sinCopia}</Alert>
      </div>
    );
  const currency = deal?.currency ?? "USD";
  const money = (value: string | number) => formatMoney(value, currency);
  const { company, contact } = customer;
  const contactName = contact ? `${contact.firstName} ${contact.lastName}`.trim() : null;

  return (
    <div className="quote-document-page">
      <div className="quote-document-toolbar">
        {back}
        <div>
          <PrintButton label={texto.descargar} />
          <p>{texto.ayudaDescarga}</p>
        </div>
      </div>
      <article className="quote-document" aria-label={texto.version(quote.number, quote.version)}>
        <header className="quote-document-head">
          <div>
            {/* eslint-disable-next-line @next/next/no-img-element -- un <img> se imprime siempre; la máscara CSS de .brand-logo no */}
            <img className="quote-document-logo" src="/logo-wave.svg" alt="Wave" width={106} height={50} />
            <p>{texto.emisor}: Wave{issuer?.name ? ` · ${texto.emitidaPor} ${issuer.name}` : ""}{issuer?.email ? ` · ${issuer.email}` : ""}</p>
          </div>
          <div className="quote-document-title">
            <span>{texto.titulo}</span>
            <h2>{texto.version(quote.number, quote.version)}</h2>
            <dl>
              <dt>{texto.estado}</dt><dd>{ESTADO_COTIZACION[quote.status]}</dd>
              <dt>{texto.enviada}</dt><dd>{day(quote.sentAt)}</dd>
              <dt>{texto.vigencia}</dt><dd>{day(quote.validUntil)}</dd>
            </dl>
          </div>
        </header>

        <section className="quote-document-parties">
          <div>
            <h3>{texto.cliente}</h3>
            {company ? (
              <>
                <strong>{company.legalName || company.name}</strong>
                {company.taxId && <p>{texto.ruc}: {company.taxId}</p>}
                <p>{join(company.address, company.city)}</p>
                <p>{join(company.email, company.phone)}</p>
              </>
            ) : (
              <>
                <strong>{contactName}</strong>
                {contact?.documentId && <p>{texto.documento}: {contact.documentId}</p>}
              </>
            )}
          </div>
          {contact && (
            <div>
              <h3>{texto.contacto}</h3>
              <strong>{contactName}</strong>
              {contact.position && <p>{contact.position}</p>}
              <p>{join(contact.email, contact.phone)}</p>
            </div>
          )}
          <div>
            <h3>{texto.negocio}</h3>
            <strong>{deal?.title ?? quote.deal.title}</strong>
          </div>
        </section>

        <section>
          <h3>{texto.lineas}</h3>
          <div className="quote-document-table-wrap">
            <table className="quote-document-table">
              <thead>
                <tr>
                  <th scope="col">{texto.columnas.descripcion}</th>
                  <th scope="col">{texto.columnas.cantidad}</th>
                  <th scope="col">{texto.columnas.precio}</th>
                  <th scope="col">{texto.columnas.descuento}</th>
                  <th scope="col">{texto.columnas.iva}</th>
                  <th scope="col">{texto.columnas.subtotal}</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((line, index) => (
                  <tr key={index}>
                    <td>
                      {line.description}
                      {line.product?.code && <small>{texto.codigo}: {line.product.code}</small>}
                    </td>
                    <td>{line.quantity}</td>
                    <td>{money(line.unitPrice)}</td>
                    <td>{line.discountRate ?? 0} %</td>
                    <td>{line.taxRate} %</td>
                    <td>{money(lineTotal({ ...line, quantity: Number(line.quantity), unitPrice: Number(line.unitPrice) }))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Totales guardados por el API en la versión, no recalculados en pantalla. */}
          <dl className="quote-document-totals">
            <dt>{texto.subtotal}</dt><dd>{money(quote.subtotal)}</dd>
            <dt>{texto.impuesto}</dt><dd>{money(quote.tax)}</dd>
            <dt>{texto.total}</dt><dd>{money(quote.total)}</dd>
          </dl>
        </section>

        <section className="quote-document-terms">
          <h3>{texto.condiciones}</h3>
          <ul>
            <li>{texto.condicionVigencia(day(quote.validUntil))}</li>
            <li>{texto.condicionMoneda(currency)}</li>
            <li>{texto.condicionSri}</li>
          </ul>
        </section>

        <section className="quote-document-signatures">
          <div>
            <span>{issuer?.name ?? ""}</span>
            <strong>{texto.firmaEmisor}</strong>
          </div>
          <div>
            <span />
            <strong>{texto.firmaCliente}</strong>
            <small>{texto.firmaAyuda}</small>
          </div>
        </section>
      </article>
    </div>
  );
}
