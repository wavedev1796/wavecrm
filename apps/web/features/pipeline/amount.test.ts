import { expect, test } from "vitest";
import { formatAmount, parseAmount } from "@wave/shared";

test("el punto de miles es opcional y solo la coma marca los centavos", () => {
  expect(parseAmount("8000")).toBe(8000);
  expect(parseAmount("8.000")).toBe(8000);
  expect(parseAmount(" 8.452 ")).toBe(8452);
  expect(parseAmount("8000,5")).toBe(8000.5);
  expect(parseAmount("8.000,50")).toBe(8000.5);
  expect(parseAmount("1.250.000,99")).toBe(1250000.99);
  expect(parseAmount("999.999.999.999,99")).toBe(999999999999.99);
  expect(parseAmount("0,25")).toBe(0.25);
});

test("rechaza el punto como decimal, tres decimales y grupos mal formados", () => {
  for (const value of ["8.45", "520.25", "80.00", "8,452", "8.0000", "8.00.000", "1,", ",5", "-5", "abc", "", "1 000"])
    expect(parseAmount(value), value).toBeNull();
  expect(parseAmount("1.000.000.000.000")).toBeNull();
  expect(parseAmount("1.000.000", 6)).toBeNull();
  expect(parseAmount("999.999", 6)).toBe(999999);
});

test("formatea lo que devuelve el API como lo escribe la persona", () => {
  expect(formatAmount("8452.50")).toBe("8.452,50");
  expect(formatAmount(1250000)).toBe("1.250.000,00");
  expect(formatAmount(0.5)).toBe("0,50");
  expect(parseAmount(formatAmount("999999999999.99"))).toBe(999999999999.99);
});
