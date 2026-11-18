import Link from "next/link";
import { cache } from "react";
import { Pagination } from "@/components/data/pagination";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Table } from "@/components/ui/table";
import { ESTADO_COTIZACION } from "@/content/catalogos";
import { COMUN } from "@/content/comun";
import { LISTADO_COTIZACIONES as texto } from "@/content/cotizaciones";
import { authenticatedApi } from "@/lib/authenticated-api";
import { formatDay, formatMoney } from "@/lib/format";
import type { ListParams } from "@/lib/list-params";
import type { DealStatus } from "@wave/shared";
import type { Quote } from "../pipeline/types";
import { QuoteResolution } from "./quote-resolution";
import { quoteTone } from "./quote-tone";

export type QuoteRow = Omit<Quote, "items"> & {
  deal: {
    id: string;
    title: string;
    currency: string;
    status: DealStatus;
    company: { name: string } | null;
    contact: { firstName: string; lastName: string } | null;
  };
};
type QuoteList = { data: QuoteRow[]; meta: { page: number; limit: number; total: number; totalPages: number } };

/** Una sola llamada al API por render, aunque la pidan el resumen y la tabla. */
const getQuotes = cache(async (query: string): Promise<QuoteList | null> => {
  const response = await authenticatedApi(`/quotes?${query}`);
  return response.ok ? ((await response.json()) as QuoteList) : null;
});

export async function QuotesSummary({ query }: Readonly<{ query: string }>) {
  const result = await getQuotes(query);
  return result ? texto.total(result.meta.total) : texto.resumenSinDatos;
}

export async function QuotesResults({ query, params }: Readonly<{ query: string; params: ListParams }>) {
  const result = await getQuotes(query);
  if (!result)
    return (
      <div className="data-card-alert">
        <Alert tone="error">{texto.errorCarga}</Alert>
      </div>
    );
  const quotes = result.data;
  return (
    <>
      <Table>
        <thead>
          <tr>
            {texto.columnas.map((columna) => (
              <th key={columna}>{columna}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {quotes.map((quote) => (
            <QuoteRowView key={quote.id} quote={quote} />
          ))}
          {!quotes.length && (
            <tr>
              <td colSpan={texto.columnas.length} className="empty-table">
                {texto.sinResultados}
              </td>
            </tr>
          )}
        </tbody>
      </Table>
      <Pagination basePath="/cotizaciones" params={params} meta={result.meta} shown={quotes.length} label={texto.paginacion} />
    </>
  );
}

const day = (value?: string | null) => (value ? formatDay(value) : COMUN.sinDato);

function QuoteRowView({ quote }: Readonly<{ quote: QuoteRow }>) {
  const { deal } = quote;
  const client =
    deal.company?.name || [deal.contact?.firstName, deal.contact?.lastName].filter(Boolean).join(" ") || COMUN.sinDato;
  // El API solo resuelve versiones enviadas de negocios abiertos; el resto no muestra botones.
  const open = quote.status === "SENT" && deal.status === "OPEN";
  return (
    <tr>
      <td>
        <span className="quote-cell">
          <Link href={`/cotizaciones/${quote.id}`} aria-label={texto.verDocumento(quote.number)}>
            <strong>{quote.number}{quote.version ? ` · v${quote.version}` : ""}</strong>
          </Link>
          <Link className="quote-cell-deal" href={`/pipeline/${deal.id}`}>{deal.title}</Link>
        </span>
      </td>
      <td>{client}</td>
      <td><Badge tone={quoteTone(quote.status)}>{ESTADO_COTIZACION[quote.status]}</Badge></td>
      <td>{day(quote.sentAt)}</td>
      <td>{day(quote.validUntil)}</td>
      <td className="quote-cell-total">{formatMoney(quote.total, deal.currency)}</td>
      <td>{open ? <QuoteResolution dealId={deal.id} quoteId={quote.id} number={quote.number} /> : COMUN.sinDato}</td>
    </tr>
  );
}
