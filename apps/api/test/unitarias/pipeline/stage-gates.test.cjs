const { test } = require("node:test");
const assert = require("node:assert/strict");
const { TRANSITION_CHECKS } = require("@wave/shared");
const {
  CHECK_MESSAGES,
  pendingChecks,
} = require("../../../dist/modules/pipeline/stage-gates.js");

// Mismo reparto que el pipeline predeterminado del seed.
const NEGOCIACION = ["CONTACT", "OWNER", "INTERACTION", "NEED", "NEXT_ACTIVITY"];
const PROPUESTA = ["SOLUTION", "BUDGET", "PROPOSAL_SENT", "EXPECTED_CLOSE"];
const stage = (id, position, probability, requirements = [], pipelineId = "p1") => ({
  id,
  pipelineId,
  position,
  probability,
  requirements,
});
const [contactado, negociacion, propuesta, ganado] = [
  stage("s1", 1, 15),
  stage("s2", 2, 45, NEGOCIACION),
  stage("s3", 3, 70, PROPUESTA),
  stage("s4", 4, 100),
];
const stages = [contactado, negociacion, propuesta, ganado];
const today = new Date("2026-10-18T00:00:00.000Z");
const tomorrow = new Date("2026-10-19T00:00:00.000Z");

/** Un negocio abierto con todos los datos; cada prueba quita lo que necesita. */
const facts = (overrides = {}) => ({
  status: "OPEN",
  stage: contactado,
  contactId: "c1",
  ownerId: "u1",
  need: "Tienda en línea",
  solution: "Plan anual de comercio electrónico",
  budget: "5000.00",
  budgetNote: null,
  expectedClose: new Date("2026-11-30T00:00:00.000Z"),
  hasInteraction: true,
  hasNextActivity: true,
  quote: { status: "ACCEPTED", total: "115.00" },
  itemsTotal: "115.00",
  ...overrides,
});
const empty = {
  contactId: null,
  ownerId: null,
  need: null,
  solution: null,
  budget: null,
  budgetNote: null,
  expectedClose: null,
  hasInteraction: false,
  hasNextActivity: false,
  quote: null,
  itemsTotal: null,
};
const to = (target) => ({ kind: "stage", stage: target });
const won = { kind: "won", stage: ganado };
const codes = (dealFacts, target, input = {}) =>
  pendingChecks(dealFacts, target, stages, input, today).map((p) => p.code);

test("Contactado → Negociación se permite con todos los datos", () => {
  assert.deepEqual(codes(facts(), to(negociacion)), []);
});

for (const [code, overrides] of [
  ["CONTACT", { contactId: null }],
  ["OWNER", { ownerId: null }],
  ["INTERACTION", { hasInteraction: false }],
  ["NEED", { need: "   " }],
  ["NEXT_ACTIVITY", { hasNextActivity: false }],
])
  test(`sin ${code} no se entra a Negociación`, () => {
    assert.deepEqual(codes(facts(overrides), to(negociacion)), [code]);
  });

test("Negociación → Propuesta exige solución, presupuesto, fecha estimada y propuesta enviada", () => {
  const sinDatos = { solution: null, budget: null, expectedClose: null, quote: null };
  assert.deepEqual(codes(facts({ ...sinDatos, stage: negociacion }), to(propuesta)), [
    "SOLUTION",
    "BUDGET",
    "EXPECTED_CLOSE",
    "PROPOSAL_SENT",
  ]);
  const borrador = facts({ stage: negociacion, quote: { status: "DRAFT", total: "115.00" } });
  assert.deepEqual(codes(borrador, to(propuesta)), ["PROPOSAL_SENT"]);
  const enviada = facts({ stage: negociacion, quote: { status: "SENT", total: "115.00" } });
  assert.deepEqual(codes(enviada, to(propuesta)), []);
});

test("un presupuesto sin monto cumple si su incertidumbre está justificada", () => {
  const justificado = facts({ stage: negociacion, budget: null, budgetNote: "Lo aprueba el directorio en noviembre" });
  assert.deepEqual(codes(justificado, to(propuesta)), []);
  assert.deepEqual(codes(facts({ stage: negociacion, budget: null, budgetNote: " " }), to(propuesta)), ["BUDGET"]);
});

test("saltar de Contactado a Propuesta exige los requisitos de las dos etapas", () => {
  assert.deepEqual(codes(facts(empty), to(propuesta)), [...NEGOCIACION, "SOLUTION", "BUDGET", "EXPECTED_CLOSE", "PROPOSAL_SENT"]);
});

test("retroceder no exige requisitos pero sí motivo", () => {
  const atrasado = facts({ ...empty, stage: propuesta });
  assert.deepEqual(codes(atrasado, to(contactado)), ["REASON"]);
  assert.deepEqual(codes(atrasado, to(contactado), { reason: "  " }), ["REASON"]);
  assert.deepEqual(codes(atrasado, to(contactado), { reason: "El cliente pidió revisar la necesidad" }), []);
});

test("volver a avanzar tras un retroceso comprueba de nuevo las etapas", () => {
  assert.deepEqual(codes(facts({ need: null, stage: contactado }), to(propuesta)), ["NEED"]);
});

test("ganar sin propuesta aceptada lo bloquea", () => {
  const enviada = facts({ stage: propuesta, quote: { status: "SENT", total: "115.00" } });
  assert.deepEqual(codes(enviada, won, { closedAt: today }), ["ACCEPTANCE"]);
});

test("ganar exige que el importe aceptado sea el de los productos", () => {
  assert.deepEqual(codes(facts({ stage: propuesta, itemsTotal: "230.00" }), won, { closedAt: today }), ["FINAL_AMOUNT"]);
  assert.deepEqual(codes(facts({ stage: propuesta, itemsTotal: null }), won, { closedAt: today }), ["FINAL_AMOUNT"]);
  assert.deepEqual(codes(facts({ stage: propuesta, itemsTotal: "115" }), won, { closedAt: today }), []);
});

test("ganar exige la fecha real de cierre y no la acepta futura", () => {
  assert.deepEqual(codes(facts({ stage: propuesta }), won), ["CLOSED_AT"]);
  assert.deepEqual(codes(facts({ stage: propuesta }), won, { closedAt: tomorrow }), ["CLOSED_AT"]);
});

test("ganar no obliga a programar otra actividad", () => {
  assert.deepEqual(codes(facts({ stage: propuesta, hasNextActivity: false }), won, { closedAt: today }), []);
});

test("ganar desde Contactado es un salto: pide todo lo de las etapas abiertas y el cierre", () => {
  assert.deepEqual(codes(facts(empty), won), [
    "CONTACT",
    "OWNER",
    "INTERACTION",
    "NEED",
    "SOLUTION",
    "BUDGET",
    "EXPECTED_CLOSE",
    "PROPOSAL_SENT",
    "ACCEPTANCE",
    "CLOSED_AT",
  ]);
});

test("un pipeline sin etapa de 100 % también gana con las condiciones de cierre", () => {
  assert.deepEqual(codes(facts({ stage: propuesta }), { kind: "won", stage: null }, { closedAt: today }), []);
});

test("perder exige el motivo", () => {
  assert.deepEqual(codes(facts(empty), { kind: "lost" }), ["LOSS_REASON"]);
  assert.deepEqual(codes(facts(empty), { kind: "lost" }, { lossReason: "NEGOTIATION" }), []);
});

test("rechazar exige su propio motivo y nada de las etapas", () => {
  assert.deepEqual(codes(facts(empty), { kind: "rejected" }), ["REJECTION_REASON"]);
  assert.deepEqual(codes(facts({ ...empty, status: "LOST" }), { kind: "rejected" }, { lossReason: "DO_NOT_CONTACT" }), []);
});

test("reabrir exige motivo", () => {
  const ganadoFacts = facts({ status: "WON", stage: ganado });
  assert.deepEqual(codes(ganadoFacts, { kind: "reopen", stage: propuesta }), ["REASON"]);
  assert.deepEqual(codes(ganadoFacts, { kind: "reopen", stage: propuesta }, { reason: "El cliente anuló la orden" }), []);
});

test("arrastrar un perdido a una etapa posterior lo reabre y comprueba los requisitos", () => {
  const perdido = facts({ status: "LOST", stage: contactado, need: null });
  assert.deepEqual(codes(perdido, to(negociacion)), ["NEED", "REASON"]);
  assert.deepEqual(codes(perdido, to(contactado), { reason: "Volvió a escribir" }), []);
});

test("un alta en Negociación lista lo que un negocio nuevo aún no tiene", () => {
  const alta = facts({ stage: null, need: null, hasInteraction: false, hasNextActivity: false, quote: null });
  assert.deepEqual(codes(alta, to(negociacion)), ["INTERACTION", "NEED", "NEXT_ACTIVITY"]);
  assert.deepEqual(codes(alta, to(contactado)), []);
});

test("pasar a otro pipeline cuenta como avance en el pipeline de destino", () => {
  const otro = stage("x1", 1, 20, ["NEED"], "p2");
  const dealFacts = facts({ stage: propuesta, need: null });
  assert.deepEqual(pendingChecks(dealFacts, to(otro), [...stages, otro], {}, today).map((p) => p.code), ["NEED"]);
});

test("cada pendiente trae su mensaje en español", () => {
  for (const code of TRANSITION_CHECKS) assert.match(CHECK_MESSAGES[code], /^[A-ZÁÉÍÓÚ].+\.$/);
  assert.deepEqual(pendingChecks(facts({ contactId: null }), to(negociacion), stages, {}, today), [
    { code: "CONTACT", message: CHECK_MESSAGES.CONTACT },
  ]);
});
