"use client";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Package, Plus, Trash2 } from "lucide-react";
import { formatAmount, IVA_SUGGESTIONS } from "@wave/shared";
import { FieldIcon } from "@/components/form/field-icon";
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
  // ponytail: las filas guardadas usan su id y las nuevas un contador por instancia, así servidor y navegador coinciden.
  const prefix = useId();
  const nextKey = useRef(0);
  const [rows, setRows] = useState(() => items.map((item) => toRow(item.id, item)));
  const savedSignature = signature(items.map((item) => toRow(item.id, item)));
  const [errors, setErrors] = useState<ItemErrors>({});
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const totals = itemTotals(rows);
  useEffect(() => onDirtyChange?.(signature(rows) !== savedSignature), [onDirtyChange, rows, savedSignature]);
  const change = (key: string, field: keyof ItemValues, value: string) =>
    setRows(rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  const save = () =>
    startTransition(async () => {
      setFeedback(null);
      const result = await saveDealItemsAction(
        dealId,
        rows.map(({ description, quantity, unitPrice, taxRate, discountRate }) => ({ description, quantity, unitPrice, taxRate, discountRate })),
      );
      setErrors(result.rowErrors ?? {});
      if (result.error) setFeedback({ tone: "error", message: result.error });
      else if (!result.rowErrors) {
        setFeedback({ tone: "success", message: texto.guardados });
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
    <Card className={"contact-related deal-items" + (locked ? "" : " deal-items--editable")}>
      <h3>
        <Package aria-hidden />
        {texto.titulo} <Badge tone="blue">{rows.length}</Badge>
      </h3>
      {locked && <Alert tone="note">{texto.bloqueados}</Alert>}
      <datalist id={prefix + "-iva"}>
        {IVA_SUGGESTIONS.map((rate) => (
          <option key={rate} value={rate} />
        ))}
      </datalist>
      {feedback && <Alert tone={feedback.tone}>{feedback.message}</Alert>}
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
              {!locked && (
                <th className="deal-items-remove">
                  <span className="sr-only">{texto.acciones}</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={row.key}>
                <td>{locked ? row.description : cell(row, index, "description", texto.descripcion)}</td>
                <td className="deal-items-qty">
                  {locked ? row.quantity : cell(row, index, "quantity", texto.cantidad)}
                </td>
                <td className="deal-items-money">
                  {locked ? formatMoney(row.unitPrice) : cell(row, index, "unitPrice", texto.precio)}
                </td>
                <td className="deal-items-tax">
                  {locked ? texto.tarifa(Number(row.taxRate)) : cell(row, index, "taxRate", texto.iva)}
                </td>
                <td className="deal-items-tax">
                  {locked ? `${row.discountRate} %` : cell(row, index, "discountRate", texto.descuento)}
                </td>
                <td className="deal-items-money deal-items-line">{formatMoney(lineTotal(row))}</td>
                {!locked && (
                  <td className="deal-items-remove">
                    <button
                      type="button"
                      className="icon-button icon-button--delete"
                      aria-label={texto.quitar(index + 1)}
                      onClick={() => {
                        setRows(rows.filter((other) => other.key !== row.key));
                        setErrors({}); // los errores van por posición: al quitar una fila saltarían a otra
                      }}
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
        <p>{texto.vacio}</p>
      )}
      <dl className="deal-totals">
        <dt>{texto.subtotal}</dt>
        <dd>{formatMoney(totals.subtotal)}</dd>
        <dt>{texto.impuesto}</dt>
        <dd>{formatMoney(totals.tax)}</dd>
        <dt>{texto.total}</dt>
        <dd data-testid="deal-total" className="deal-total">
          {formatMoney(totals.total)}
        </dd>
      </dl>
      {!locked && (
        <div className="deal-items-actions">
          <Button
            variant="secondary"
            disabled={pending || rows.length >= 100}
            title={rows.length >= 100 ? texto.maximo : undefined}
            onClick={() => setRows([...rows, toRow("new-" + ++nextKey.current)])}
          >
            <Plus aria-hidden />
            {texto.agregar}
          </Button>
          <Button loading={pending} onClick={save}>
            {texto.guardar}
          </Button>
        </div>
      )}
    </Card>
  );
}
