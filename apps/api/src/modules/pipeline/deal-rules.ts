import { Prisma } from "@wave/database";

type Line = {
  quantity: Prisma.Decimal.Value;
  unitPrice: Prisma.Decimal.Value;
  taxRate: number;
};

/** Máximo de Decimal(14,2): ni el valor del negocio ni el subtotal pueden pasarlo. */
export const MAX_DEAL_VALUE = "999999999999.99";

/** Subtotal sin IVA (el valor del negocio), IVA por tarifa y total, con centavos exactos. */
export function dealTotals(items: readonly Line[]) {
  const zero = new Prisma.Decimal(0);
  const bases = new Map<number, Prisma.Decimal>();
  let subtotal = zero;
  for (const item of items) {
    const line = new Prisma.Decimal(item.quantity)
      .times(item.unitPrice)
      .toDecimalPlaces(2);
    subtotal = subtotal.plus(line);
    bases.set(item.taxRate, (bases.get(item.taxRate) ?? zero).plus(line));
  }
  const tax = [...bases].reduce(
    (sum, [rate, base]) =>
      sum.plus(base.times(rate).dividedBy(100).toDecimalPlaces(2)),
    zero,
  );
  return { subtotal, tax, total: subtotal.plus(tax) };
}

// ponytail: el mayor COT- + 1 dentro de una transacción serializable; seis dígitos ordenan bien
// hasta COT-999999. Pasar a una secuencia de Postgres antes de llegar ahí.
export const nextQuoteNumber = (last: string | null | undefined) =>
  "COT-" +
  String(Number(/^COT-(\d+)$/.exec(last ?? "")?.[1] ?? 0) + 1).padStart(6, "0");

/** Un día de calendario se guarda a las 00:00 UTC, igual que la fecha estimada de cierre. */
export const toDay = (date: Date) =>
  new Date(date.toISOString().slice(0, 10) + "T00:00:00.000Z");

// ponytail: Ecuador continental está en UTC-5 todo el año (sin horario de verano).
export const ecuadorToday = (now = new Date()) =>
  toDay(new Date(now.getTime() - 5 * 60 * 60 * 1000));
