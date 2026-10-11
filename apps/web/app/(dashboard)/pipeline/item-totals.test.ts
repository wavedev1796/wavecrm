import { expect, test } from "vitest";
import { itemTotals, lineTotal } from "./item-totals";

test("muestra los mismos totales que el API: IVA por tarifa y centavos", () => {
  expect(
    itemTotals([
      { quantity: "2", unitPrice: "10", taxRate: 0 },
      { quantity: "1", unitPrice: "100", taxRate: 15 },
    ]),
  ).toEqual({ subtotal: 120, tax: 15, total: 135 });
  expect(lineTotal({ quantity: "1,5", unitPrice: "0.25", taxRate: 15 })).toBe(0.38);
  expect(itemTotals([{ quantity: "abc", unitPrice: "", taxRate: 15 }])).toEqual({
    subtotal: 0,
    tax: 0,
    total: 0,
  });
});
