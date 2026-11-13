"use client";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Package, Plus, Save, Trash2, X } from "lucide-react";
import { formatAmount, IVA_SUGGESTIONS } from "@wave/shared";
import { FieldIcon } from "@/components/form/field-icon";
import { FormDialog } from "@/components/form/form-dialog";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, invalidProps } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Table } from "@/components/ui/table";
import { NEGOCIO } from "@/content/pipeline";
import { formatMoney } from "@/lib/format";
import { saveDealItemsAction } from "./actions";
import { itemTotals, lineTotal } from "./item-totals";
import type { DealItem, ItemErrors, ItemValues } from "./types";

type Row = Required<ItemValues> & { key: string };
const texto = NEGOCIO.productos;
const INPUT_MODE = { description: undefined, quantity: "decimal", unitPrice: "decimal", taxRate: "numeric", discountRate: "numeric" } as const;
const MAX_LENGTH = { description: 200, quantity: 16, unitPrice: 16, taxRate: 3, discountRate: 3 } as const;
const toRow = (key: string, item?: DealItem): Row => ({
  key,
  description: item?.description ?? "",
  quantity: item ? formatAmount(item.quantity).replace(/,00$/, "") : "",
  unitPrice: item ? formatAmount(item.unitPrice) : "",
  taxRate: String(item?.taxRate ?? IVA_SUGGESTIONS[0]),
  discountRate: String(item?.discountRate ?? 0),
});
const signature = (rows: readonly Row[]) => JSON.stringify(rows.map(({ description, quantity, unitPrice, taxRate, discountRate }) => ({ description, quantity, unitPrice, taxRate, discountRate })));

export function DealItems({
  dealId,
  items,
  locked,
  onDirtyChange,
  onSaved,
}: Readonly<{ dealId: string; items: DealItem[]; locked: boolean; onDirtyChange?: (dirty: boolean) => void; onSaved?: () => void }>) {
  const prefix = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const nextKey = useRef(0);
  const [rows, setRows] = useState(() => items.map((item) => toRow(item.id, item)));
  const savedSignature = signature(items.map((item) => toRow(item.id, item)));
  const [errors, setErrors] = useState<ItemErrors>({});
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const totals = itemTotals(rows);
  const dirty = signature(rows) !== savedSignature;

  useEffect(() => onDirtyChange?.(dirty), [dirty, onDirtyChange]);

  const change = (key: string, field: keyof ItemValues, value: string) =>
    setRows((current) => current.map((row) => row.key === key ? { ...row, [field]: value } : row));

  const save = () => startTransition(async () => {
    setFeedback(null);
    const result = await saveDealItemsAction(
      dealId,
      rows.map(({ description, quantity, unitPrice, taxRate, discountRate }) => ({ description, quantity, unitPrice, taxRate, discountRate })),
    );
    setErrors(result.rowErrors ?? {});
    if (result.error) setFeedback({ tone: "error", message: result.error });
    else if (!result.rowErrors) {
      setFeedback({ tone: "success", message: texto.guardados });
      dialog.current?.close();
      onSaved?.();
    }
  });

  const cell = (row: Row, index: number, field: keyof ItemValues & string, label: string) => {
    const id = prefix + "-" + row.key + "-" + field;
    const error = errors[index]?.[field];
    return (
      <>
        <Input
          id={id}
          aria-label={texto.celda(label, index + 1)}
          value={row[field]}
          inputMode={INPUT_MODE[field]}
          maxLength={MAX_LENGTH[field]}
          list={field === "taxRate" ? prefix + "-iva" : undefined}
          onChange={(event) => change(row.key, field, event.target.value)}
          {...invalidProps(id, error)}
        />
        <FieldError id={id} message={error} />
      </>
    );
  };

  return (
    <>
      <Card className="contact-related deal-items deal-items--summary">
        <div className="deal-section-heading">
          <h3><Package aria-hidden />{texto.titulo}<Badge tone="blue">{rows.length}</Badge></h3>
          {!locked && (
            <Button type="button" variant="secondary" onClick={() => dialog.current?.showModal()}>
              <Package aria-hidden />{texto.editarLineas}
            </Button>
          )}
        </div>
        {locked && <Alert tone="note">{texto.bloqueados}</Alert>}
        {feedback?.tone === "success" && <Alert tone="success">{feedback.message}</Alert>}
        {rows.length ? (
          <div className="deal-items-summary-row">
            <div>
              <strong>{rows.slice(0, 2).map((row) => row.description || texto.sinDescripcion).join(" · ")}</strong>
              {rows.length > 2 && <span className="field-hint"> + {rows.length - 2} más</span>}
              <span className="field-hint"> · {dirty ? texto.cambiosSinGuardar : texto.lineasGuardadas}</span>
            </div>
            <div className="deal-items-summary-total">
              <span>{texto.total}</span>
              <b>{formatMoney(totals.total)}</b>
            </div>
          </div>
        ) : (
          <p className="deal-items-empty">{texto.vacio}</p>
        )}
        {dirty && <Alert tone="note">{texto.cambiosPendientesCotizacion}</Alert>}
      </Card>

      <FormDialog
        dialogRef={dialog}
        label={texto.dialogoTitulo}
        closeLabel={texto.cerrarEditor}
      >
        <div className="deal-editor-dialog">
          <header className="deal-dialog-header">
            <span className="field-hint">{texto.titulo}</span>
            <h2>{texto.dialogoTitulo}</h2>
            <p>{texto.dialogoAyuda}</p>
          </header>
          {feedback?.tone === "error" && <Alert tone="error">{feedback.message}</Alert>}
          <datalist id={prefix + "-iva"}>
            {IVA_SUGGESTIONS.map((rate) => <option key={rate} value={rate} />)}
          </datalist>
          {rows.length ? (
            <Table>
              <thead>
                <tr>
                  <th><FieldIcon name="producto" />{texto.descripcion}</th>
                  <th><FieldIcon name="cantidad" />{texto.cantidad}</th>
                  <th><FieldIcon name="dinero" />{texto.precio}</th>
                  <th><FieldIcon name="porcentaje" />{texto.iva}</th>
                  <th><FieldIcon name="porcentaje" />{texto.descuento}</th>
                  <th className="deal-items-money">{texto.subtotalFila}</th>
                  {!locked && <th className="deal-items-remove"><span className="sr-only">{texto.acciones}</span></th>}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.key}>
                    <td>{locked ? row.description : cell(row, index, "description", texto.descripcion)}</td>
                    <td className="deal-items-qty">{locked ? row.quantity : cell(row, index, "quantity", texto.cantidad)}</td>
                    <td className="deal-items-money">{locked ? formatMoney(row.unitPrice) : cell(row, index, "unitPrice", texto.precio)}</td>
                    <td className="deal-items-tax">{locked ? texto.tarifa(Number(row.taxRate)) : cell(row, index, "taxRate", texto.iva)}</td>
                    <td className="deal-items-tax">{locked ? `${row.discountRate} %` : cell(row, index, "discountRate", texto.descuento)}</td>
                    <td className="deal-items-money deal-items-line">{formatMoney(lineTotal(row))}</td>
                    {!locked && (
                      <td className="deal-items-remove">
                        <button
                          type="button"
                          className="icon-button icon-button--delete"
                          aria-label={texto.quitar(index + 1)}
                          onClick={() => { setRows((current) => current.filter((other) => other.key !== row.key)); setErrors({}); }}
                        >
                          <Trash2 aria-hidden />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <p className="deal-items-empty">{texto.vacio}</p>
          )}
          <dl className="deal-totals deal-editor-totals">
            <dt>{texto.subtotal}</dt><dd>{formatMoney(totals.subtotal)}</dd>
            <dt>{texto.impuesto}</dt><dd>{formatMoney(totals.tax)}</dd>
            <dt>{texto.total}</dt><dd data-testid="deal-total" className="deal-total">{formatMoney(totals.total)}</dd>
          </dl>
          <div className="deal-dialog-actions">
            {!locked && (
              <Button
                type="button"
                variant="secondary"
                disabled={pending || rows.length >= 100}
                title={rows.length >= 100 ? texto.maximo : undefined}
                onClick={() => setRows((current) => [...current, toRow("new-" + ++nextKey.current)])}
              >
                <Plus aria-hidden />{texto.agregar}
              </Button>
            )}
            <div>
              <Button type="button" variant="ghost" disabled={pending} onClick={() => dialog.current?.close()}>
                <X aria-hidden />{texto.cancelar}
              </Button>
              {!locked && (
                <Button type="button" loading={pending} onClick={save}>
                  <Save aria-hidden />{texto.guardar}
                </Button>
              )}
            </div>
          </div>
        </div>
      </FormDialog>
    </>
  );
}
