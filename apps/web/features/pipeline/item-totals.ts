import { decimal } from "./deal-validation";

type Line = {
  quantity: string | number;
  unitPrice: string | number;
  taxRate: number | string;
};

// ponytail: centavos en enteros solo para mostrar mientras se edita; el valor que se guarda
// lo calcula el API con Decimal (deal-rules.ts) y las dos reglas son las mismas.
const cents = (value: string | number) => {
  const number = Number(decimal(String(value)));
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
};
const lineCents = (line: Line) =>
  Math.round((cents(line.quantity) * cents(line.unitPrice)) / 100);

export const lineTotal = (line: Line) => lineCents(line) / 100;

export function itemTotals(items: readonly Line[]) {
  const bases = new Map<number, number>();
  let subtotal = 0;
  for (const item of items) {
    const line = lineCents(item);
    subtotal += line;
    const rate = Number(item.taxRate);
    bases.set(rate, (bases.get(rate) ?? 0) + line);
  }
  let tax = 0;
  for (const [rate, base] of bases) tax += Math.round((base * rate) / 100);
  return { subtotal: subtotal / 100, tax: tax / 100, total: (subtotal + tax) / 100 };
}
