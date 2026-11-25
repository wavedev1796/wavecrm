const { test } = require("node:test");
const assert = require("node:assert/strict");
const { UnprocessableEntityException } = require("@nestjs/common");
const { Prisma } = require("@wave/database");
const {
  billingStatus,
  buyerOptions,
  toBuyer,
  toInvoiceLines,
} = require("../../../dist/modules/billing/billing-rules.js");
const { dealTotals } = require("../../../dist/modules/pipeline/deal-rules.js");

const company = (over = {}) => ({
  name: "Acme",
  legalName: "Acme S.A.",
  taxId: "1790012345001",
  address: "Av. Siempre Viva 1",
  city: "Quito",
  email: "acme@x.com",
  phone: "0999999999",
  ...over,
});
const contact = (over = {}) => ({
  firstName: "Ana",
  lastName: "Pérez",
  documentType: "CEDULA",
  documentId: "1710034065",
  city: null,
  email: "ana@x.com",
  phone: null,
  ...over,
});
const ruc = { documentType: "RUC", documentId: "1710034065001" };

test("buyerOptions: quién puede recibir la factura", () => {
  assert.deepEqual(buyerOptions(company(), contact(ruc)), {
    options: ["COMPANY", "CONTACT"],
    default: "COMPANY",
  });
  assert.deepEqual(buyerOptions(company(), contact()), {
    options: ["COMPANY"],
    default: "COMPANY",
  });
  assert.deepEqual(buyerOptions(null, contact({ documentType: "PASAPORTE" })), {
    options: ["CONTACT"],
    default: "CONTACT",
  });
  assert.deepEqual(buyerOptions(null, contact(ruc)), {
    options: ["CONTACT"],
    default: "CONTACT",
  });
  assert.equal(buyerOptions(null, null), null);
});

test("toBuyer: empresa usa respaldos y omite lo que falta", () => {
  const buyer = toBuyer(
    "COMPANY",
    company({ legalName: null, address: null, email: null, phone: null }),
    contact(),
  );
  assert.deepEqual(buyer, {
    tipoIdentificacion: "04",
    identificacion: "1790012345001",
    razonSocial: "Acme",
    direccion: "Quito",
    email: "ana@x.com",
  });
  assert.equal("telefono" in buyer, false);
  assert.equal(
    toBuyer("COMPANY", company({ address: null, city: null }), null).direccion,
    "Ecuador",
  );
});

test("toBuyer: contacto por tipo de documento", () => {
  const buyer = toBuyer("CONTACT", company(), contact());
  assert.equal(buyer.tipoIdentificacion, "05");
  assert.equal(buyer.razonSocial, "Ana Pérez");
  assert.equal(buyer.direccion, "Ecuador");
  assert.equal("telefono" in buyer, false);
  assert.equal(toBuyer("CONTACT", null, contact(ruc)).tipoIdentificacion, "04");
  assert.equal(
    toBuyer("CONTACT", null, contact({ documentType: "PASAPORTE", city: "Cuenca" })).tipoIdentificacion,
    "06",
  );
  assert.equal(
    toBuyer("CONTACT", null, contact({ city: "Cuenca" })).direccion,
    "Cuenca",
  );
});

const raw = (over = {}) => ({
  description: "Plan",
  quantity: "1.50",
  unitPrice: "33.33",
  taxRate: 15,
  discountRate: 7,
  product: null,
  ...over,
});

test("toInvoiceLines: línea con el mismo redondeo que dealTotals", () => {
  const [line] = toInvoiceLines([raw()]);
  assert.equal(line.codigoPrincipal, "ITEM-1");
  assert.equal(line.descripcion, "Plan");
  assert.equal(line.cantidad, 1.5);
  assert.equal(line.precioUnitario, 33.33);
  assert.equal(line.ivaTarifa, 15);
  assert.equal(line.ivaCodigo, "4");
  const gross = new Prisma.Decimal(line.cantidad).times(line.precioUnitario).toDecimalPlaces(2);
  const subtotal = dealTotals([{ quantity: "1.50", unitPrice: "33.33", taxRate: 15, discountRate: 7 }]).subtotal;
  assert.equal(gross.minus(line.descuento).toFixed(2), subtotal.toFixed(2));
});

test("toInvoiceLines: código del producto y errores 422", () => {
  assert.equal(
    toInvoiceLines([raw({ product: { code: "LIC-EMP", description: "x" } })])[0].codigoPrincipal,
    "LIC-EMP",
  );
  assert.equal(toInvoiceLines([raw(), raw()])[1].codigoPrincipal, "ITEM-2");
  assert.throws(
    () => toInvoiceLines([raw({ taxRate: 12 })]),
    (e) =>
      e instanceof UnprocessableEntityException &&
      e.message.includes("12") &&
      e.message.includes("Plan"),
  );
  for (const bad of [[], null, undefined]) {
    assert.throws(
      () => toInvoiceLines(bad),
      (e) =>
        e instanceof UnprocessableEntityException &&
        e.message === "Esta cotización no guarda sus productos; registra y acepta una nueva.",
    );
  }
});

test("billingStatus", () => {
  assert.equal(billingStatus("AUTORIZADO"), "AUTHORIZED");
  assert.equal(billingStatus("ENVIADA"), "SENT");
  assert.equal(billingStatus("DEVUELTA"), "RETURNED");
  assert.equal(billingStatus("NO_AUTORIZADO"), "NOT_AUTHORIZED");
  assert.equal(billingStatus("XYZ"), "SENT");
});
