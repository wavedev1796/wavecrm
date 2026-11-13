import { expect, test } from "vitest";
import { itemTotals, lineTotal } from "./item-totals";

test("muestra los mismos totales que el API: IVA por tarifa y centavos", () => {
  expect(
    itemTotals([
      { quantity: "2", unitPrice: "10", taxRate: 0 },
      { quantity: "1", unitPrice: "100", taxRate: 15 },
    ]),
  ).toEqual({ subtotal: 120, tax: 15, total: 135 });
  expect(lineTotal({ quantity: "1,5", unitPrice: "0.25", taxRate: 15 })).toBe(
    0.38,
  );
  expect(itemTotals([{ quantity: "abc", unitPrice: "", taxRate: 15 }])).toEqual(
    {
      subtotal: 0,
      tax: 0,
      total: 0,
    },
  );
});

test("aplica descuento antes del IVA con el redondeo de cada línea del API", () => {
  const lines = [
    { quantity: "2", unitPrice: "100", taxRate: 15, discountRate: 10 },
    { quantity: "1", unitPrice: "0.05", taxRate: 0, discountRate: 50 },
  ];
  expect(lines.map(lineTotal)).toEqual([180, 0.03]);
  expect(itemTotals(lines)).toEqual({
    subtotal: 180.03,
    tax: 27,
    total: 207.03,
  });
});
