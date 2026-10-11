"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package, Plus, Trash2 } from "lucide-react";
import { IVA_RATES } from "@wave/shared";
import { Alert } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldError, invalidProps } from "@/components/ui/field-error";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Table } from "@/components/ui/table";
import { NEGOCIO } from "@/content/pipeline";
import { formatMoney } from "@/lib/format";
import { saveDealItemsAction } from "./actions";
import { itemTotals, lineTotal } from "./item-totals";
import type { DealItem, ItemErrors, ItemValues } from "./types";

type Row = ItemValues & { key: string };
const texto = NEGOCIO.productos;
// ponytail: contador del módulo como clave de React; solo tiene que ser única en esta pestaña.
let lastKey = 0;
const toRow = (item?: DealItem): Row => ({
  key: String(++lastKey),
  description: item?.description ?? "",
  quantity: item ? String(item.quantity) : "",
  unitPrice: item ? String(item.unitPrice) : "",
  taxRate: String(item?.taxRate ?? IVA_RATES[0]),
});

export function DealItems({
  dealId,
  items,
  locked,
}: Readonly<{ dealId: string; items: DealItem[]; locked: boolean }>) {
  const router = useRouter();
  const [rows, setRows] = useState(() => items.map(toRow));
  const [errors, setErrors] = useState<ItemErrors>({});
  const [feedback, setFeedback] = useState<{ tone: "error" | "success"; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const totals = itemTotals(rows);
  const change = (key: string, field: keyof ItemValues, value: string) =>
    setRows(rows.map((row) => (row.key === key ? { ...row, [field]: value } : row)));
  const save = () =>
    startTransition(async () => {
      setFeedback(null);
      const result = await saveDealItemsAction(
        dealId,
        rows.map(({ description, quantity, unitPrice, taxRate }) => ({ description, quantity, unitPrice, taxRate })),
      );
      setErrors(result.rowErrors ?? {});
      if (result.error) setFeedback({ tone: "error", message: result.error });
      else if (!result.rowErrors) {
        setFeedback({ tone: "success", message: texto.guardados });
        router.refresh();
      }
    });
  const cell = (row: Row, index: number, field: "description" | "quantity" | "unitPrice", label: string) => {
    const id = "item-" + row.key + "-" + field;
    const error = errors[index]?.[field];
    return (
      <>
        <Input
          id={id}
          aria-label={texto.celda(label, index + 1)}
          value={row[field]}
          inputMode={field === "description" ? undefined : "decimal"}
          maxLength={field === "description" ? 200 : 16}
          onChange={(event) => change(row.key, field, event.target.value)}
          {...invalidProps(id, error)}
        />
        <FieldError id={id} message={error} />
      </>
    );
  };
  return (
    <Card className="contact-related deal-items">
      <h3>
        <Package aria-hidden />
        {texto.titulo} <Badge tone="blue">{rows.length}</Badge>
      </h3>
      {locked && <Alert tone="note">{texto.bloqueados}</Alert>}
      {feedback && <Alert tone={feedback.tone}>{feedback.message}</Alert>}
      {rows.length ? (
        <Table>
          <thead>
            <tr>
              <th>{texto.descripcion}</th>
              <th>{texto.cantidad}</th>
              <th>{texto.precio}</th>
              <th>{texto.iva}</th>
              <th className="deal-items-money">{texto.subtotalFila}</th>
              {!locked && (
                <th>
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
                  {locked ? (
                    texto.tarifa(Number(row.taxRate))
                  ) : (
                    <Select
                      aria-label={texto.celda(texto.iva, index + 1)}
                      value={row.taxRate}
                      onChange={(event) => change(row.key, "taxRate", event.target.value)}
                    >
                      {IVA_RATES.map((rate) => (
                        <option key={rate} value={rate}>
                          {texto.tarifa(rate)}
                        </option>
                      ))}
                    </Select>
                  )}
                </td>
                <td className="deal-items-money">{formatMoney(lineTotal(row))}</td>
                {!locked && (
                  <td>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label={texto.quitar(index + 1)}
                      onClick={() => setRows(rows.filter((other) => other.key !== row.key))}
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
            onClick={() => setRows([...rows, toRow()])}
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
