import { expect, test } from "vitest";
import { formatDate, formatDateTime, formatMoney, initials } from "./format";

test("iniciales de hasta dos palabras, sin importar los espacios", () => {
  expect(initials("Ana López")).toBe("AL");
  expect(initials("  maría   josé  pérez ")).toBe("MJ");
  expect(initials("")).toBe("");
  expect(initials()).toBe("");
});

test("dinero y fechas en es-EC, iguales a los formatos que reemplazan", () => {
  const es = (options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat("es-EC", options).format(
      new Date("2026-10-05T15:30:00Z"),
    );
  expect(formatMoney("1250.5", "USD")).toBe(
    new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD" }).format(
      1250.5,
    ),
  );
  expect(formatMoney(10)).toContain("10");
  expect(formatDate("2026-10-05T15:30:00Z")).toBe(es({ dateStyle: "medium" }));
  expect(formatDateTime("2026-10-05T15:30:00Z")).toBe(
    es({ dateStyle: "medium", timeStyle: "short" }),
  );
});
