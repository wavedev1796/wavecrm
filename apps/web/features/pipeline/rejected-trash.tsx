"use client";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { RotateCcw, Trash2 } from "lucide-react";
import { FormDialog } from "@/components/form/form-dialog";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Table } from "@/components/ui/table";
import { MOTIVO_CIERRE } from "@/content/catalogos";
import { COMUN } from "@/content/comun";
import { NEGOCIO, PAPELERA, PIPELINE, TRANSICION } from "@/content/pipeline";
import { formatDay, formatMoney } from "@/lib/format";
import { deleteRejectedAction } from "./actions";
import { TransitionDialog } from "./transition-dialog";
import type { RejectedDeal } from "./types";

type Props = {
  deals: RejectedDeal[];
  /** Solo un ADMIN reabre; eliminar lo puede cualquiera. */
  canReopen: boolean;
  /** La paginación, que renderiza la página. */
  children?: React.ReactNode;
};
type Dialog = { kind: "delete" } | { kind: "reopen"; deal: RejectedDeal };

/** Tabla de la papelera: selección múltiple, eliminación con confirmación y reabrir (ADMIN). */
export function RejectedTrash({ deals, canReopen, children }: Readonly<Props>) {
  const ref = useRef<HTMLDialogElement>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  useEffect(() => {
    if (dialog && !ref.current?.open) ref.current?.showModal();
  }, [dialog]);
  // Tras eliminar o reabrir la página llega sin esos negocios: solo cuentan los que siguen en la tabla.
  const chosen = deals.filter((deal) => selected.has(deal.id)).map((deal) => deal.id);
  const all = deals.length > 0 && chosen.length === deals.length;
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  const close = () => {
    ref.current?.close();
    setDialog(null);
  };
  const finish = (result: { tone: "error" | "success"; message: string }) => {
    close();
    setFeedback(result);
  };
  const remove = () =>
    startTransition(async () => {
      const result = await deleteRejectedAction(chosen);
      if (!result.error) setSelected(new Set());
      finish(
        result.error
          ? { tone: "error", message: result.error }
          : { tone: "success", message: PAPELERA.eliminados(result.data?.deleted ?? chosen.length) },
      );
    });
  const columns = canReopen ? PAPELERA.columnas : PAPELERA.columnas.slice(0, -1);

  return (
    <>
      <div className="table-toolbar trash-toolbar">
        {feedback ? <Alert tone={feedback.tone}>{feedback.message}</Alert> : <span />}
        <Button variant="secondary" disabled={!chosen.length} onClick={() => setDialog({ kind: "delete" })}>
          <Trash2 aria-hidden />
          {PAPELERA.eliminar(chosen.length)}
        </Button>
      </div>
      <Table>
        <thead>
          <tr>
            <th className="trash-check">
              <input
                type="checkbox"
                aria-label={PAPELERA.seleccionarTodos}
                checked={all}
                disabled={!deals.length}
                onChange={() => setSelected(all ? new Set() : new Set(deals.map((deal) => deal.id)))}
              />
            </th>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {deals.map((deal) => (
            <tr key={deal.id}>
              <td className="trash-check">
                <input
                  type="checkbox"
                  aria-label={PAPELERA.seleccionar(deal.title)}
                  checked={selected.has(deal.id)}
                  onChange={() => toggle(deal.id)}
                />
              </td>
              <td>
                <Link className="contact-cell contact-link" href={"/pipeline/" + deal.id}>
                  <span>
                    <strong>{deal.title}</strong>
                    {deal.pipeline && <small>{deal.pipeline.name}</small>}
                  </span>
                </Link>
              </td>
              <td>
                <span className="contact-cell">
                  <span>
                    <strong>
                      {deal.contact ? deal.contact.firstName + " " + deal.contact.lastName : PAPELERA.sinContacto}
                    </strong>
                    {deal.company && <small>{deal.company.name}</small>}
                  </span>
                </span>
              </td>
              <td className="deal-items-money">{formatMoney(deal.value, deal.currency)}</td>
              <td>
                <span className="contact-cell">
                  <span>
                    <strong>{deal.lossReason ? MOTIVO_CIERRE[deal.lossReason] : COMUN.sinDato}</strong>
                    {deal.lossDetail && <small>{deal.lossDetail}</small>}
                  </span>
                </span>
              </td>
              <td>{deal.closedAt ? formatDay(deal.closedAt) : COMUN.sinDato}</td>
              <td>{deal.owner?.name ?? PAPELERA.sinResponsable}</td>
              {canReopen && (
                <td>
                  <Button
                    variant="ghost"
                    aria-label={PAPELERA.reabrirDe(deal.title)}
                    onClick={() => setDialog({ kind: "reopen", deal })}
                  >
                    <RotateCcw aria-hidden />
                    {PAPELERA.reabrir}
                  </Button>
                </td>
              )}
            </tr>
          ))}
          {!deals.length && (
            <tr>
              <td colSpan={columns.length + 1} className="empty-table">
                {PAPELERA.vacio}
              </td>
            </tr>
          )}
        </tbody>
      </Table>
      {children}
      <FormDialog
        dialogRef={ref}
        label={dialog?.kind === "reopen" ? NEGOCIO.reabrir.titulo : PAPELERA.confirmarTitulo}
        closeLabel={PIPELINE.close}
        onClose={() => setDialog(null)}
      >
        {dialog?.kind === "delete" && (
          <div className="deal-inspector">
            <h2>{PAPELERA.confirmarTitulo}</h2>
            <p>{PAPELERA.confirmar(chosen.length)}</p>
            <div className="deal-confirm-actions">
              <Button variant="secondary" disabled={pending} onClick={close}>
                {PIPELINE.cancel}
              </Button>
              <Button loading={pending} onClick={remove}>
                {PAPELERA.confirmarBoton}
              </Button>
            </div>
          </div>
        )}
        {dialog?.kind === "reopen" && (
          // ponytail: reabrir solo pide el motivo (stage-gates), así que no hacen falta contactos ni usuarios.
          <TransitionDialog
            key={dialog.deal.id}
            deal={dialog.deal}
            to="REOPEN"
            targetName={TRANSICION.destinos.REOPEN}
            contacts={[]}
            users={[]}
            onCancel={close}
            onDone={(message) => finish({ tone: "success", message })}
          />
        )}
      </FormDialog>
    </>
  );
}
