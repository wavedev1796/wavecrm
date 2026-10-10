const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  dealTotals,
  ecuadorToday,
  nextQuoteNumber,
} = require("../dist/modules/pipeline/deal-rules.js");

const money = (t) => [t.subtotal, t.tax, t.total].map((d) => d.toFixed(2));

test("CRM-20: servicios con IVA 15 % suman subtotal, IVA y total", () => {
  const totals = dealTotals([
    { quantity: 1, unitPrice: 1400, taxRate: 15 },
    { quantity: 1, unitPrice: 1000, taxRate: 15 },
  ]);
  assert.deepEqual(money(totals), ["2400.00", "360.00", "2760.00"]);
});

test("CRM-20: el IVA se calcula por tarifa (0 % no suma impuesto)", () => {
  const totals = dealTotals([
    { quantity: 2, unitPrice: 10, taxRate: 0 },
    { quantity: 1, unitPrice: 100, taxRate: 15 },
  ]);
  assert.deepEqual(money(totals), ["120.00", "15.00", "135.00"]);
});

test("CRM-20: cada fila y el IVA redondean a centavos hacia arriba en la mitad", () => {
  const totals = dealTotals([{ quantity: 1.5, unitPrice: 0.25, taxRate: 15 }]);
  assert.deepEqual(money(totals), ["0.38", "0.06", "0.44"]);
  assert.deepEqual(money(dealTotals([])), ["0.00", "0.00", "0.00"]);
});

test("CRM-21: el numero de cotizacion es correlativo de seis digitos", () => {
  assert.equal(nextQuoteNumber(null), "COT-000001");
  assert.equal(nextQuoteNumber("COT-000041"), "COT-000042");
});

test("CRM-21: hoy es el dia de Ecuador guardado a las 00:00 UTC", () => {
  // 10 oct 2026, 03:00 UTC = 9 oct, 22:00 en Ecuador.
  const day = ecuadorToday(new Date("2026-10-10T03:00:00.000Z"));
  assert.equal(day.toISOString(), "2026-10-09T00:00:00.000Z");
});
