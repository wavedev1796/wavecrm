const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");
const { BillingService } = require("../../../dist/modules/billing/billing.service.js");

const KEY = "secreta-123";
const ACCESS_KEY = "2011202601172391437800110010010000000011234567815";
const env = {
  WAVE_BILLING_URL: "https://billing.test",
  WAVE_BILLING_API_KEY: KEY,
  WAVE_BILLING_EMISOR_ID: "emisor-1",
  WAVE_BILLING_SUCURSAL_ID: "sucursal-1",
  WAVE_BILLING_PTO_EMI: "001",
  WAVE_BILLING_AMBIENTE: "1",
};
const vendedor = { id: "user-1", role: "VENDEDOR" };
const otro = { id: "user-2", role: "VENDEDOR" };
const company = { id: "c1", name: "Acme", legalName: "ACME S.A.", taxId: "1792458123001", address: "Av. 1", city: "Quito", email: "a@acme.ec", phone: null };
const contact = { id: "p1", firstName: "Ana", lastName: "Paz", documentType: "CEDULA", documentId: "1710034065", city: "Quito", email: "ana@x.ec", phone: null };
const items = [{ description: "Plan", quantity: "2", unitPrice: "100", taxRate: 15, discountRate: 0, product: { code: "LIC" } }];

function setup({ status = "WON", quotes, co = company, ct = contact, handoff = null } = {}) {
  const state = {
    deal: { id: "deal-1", ownerId: "user-1", status, company: co, contact: ct },
    quotes: quotes ?? [{ id: "q1", number: "COT-000001", status: "ACCEPTED", items, createdAt: new Date(1), dealId: "deal-1" }],
    handoff,
    audit: [],
  };
  const prisma = {
    deal: {
      findFirst: async ({ where }) =>
        where.id === "deal-1" && (!where.ownerId || where.ownerId === state.deal.ownerId) ? state.deal : null,
    },
    quote: {
      findFirst: async ({ where }) =>
        state.quotes.filter((q) => q.dealId === where.dealId && q.status === where.status).sort((a, b) => b.createdAt - a.createdAt)[0] ?? null,
    },
    billingHandoff: {
      findUnique: async () => state.handoff,
      create: async ({ data }) => (state.handoff = { id: "h1", attempts: 0, messages: [], accessKey: null, sequential: null, authorizationNumber: null, authorizedAt: null, ...data, updatedAt: new Date() }),
      updateMany: async ({ where, data }) => {
        const h = state.handoff;
        const ok = h && where.OR.some((c) => (c.status.in ? c.status.in.includes(h.status) : c.status === h.status && h.updatedAt < c.updatedAt.lt));
        if (ok) Object.assign(h, data, { updatedAt: new Date() });
        return { count: ok ? 1 : 0 };
      },
      update: async ({ data }) => {
        const { attempts, ...rest } = data;
        Object.assign(state.handoff, rest, { attempts: state.handoff.attempts + attempts.increment });
        return state.handoff;
      },
    },
    auditLog: { create: async ({ data }) => state.audit.push(data) },
  };
  const service = new BillingService(prisma, { get: (k) => env[k] });
  return { state, service };
}

const dto = { buyer: "COMPANY", paymentMethod: "20" };
const reply = (status, body) => new Response(JSON.stringify(body), { status });
const ok = { claveAcceso: ACCESS_KEY, secuencial: "000000001", estado: "AUTORIZADO", numeroAutorizacion: ACCESS_KEY, fechaAutorizacion: "2026-11-20T12:45:00-05:00", mensajes: [] };
let calls;
const realFetch = globalThis.fetch;
const mockFetch = (fn) => (globalThis.fetch = async (url, init) => (calls.push({ url, init }), fn(url, init)));
beforeEach(() => { calls = []; });
afterEach(() => { globalThis.fetch = realFetch; });
const everything = (x) => JSON.stringify(x);
const rejects = (p, status) => assert.rejects(p, (e) => e.getStatus() === status);

test("estados que no se pueden enviar", async () => {
  await rejects(setup({ status: "OPEN" }).service.send("deal-1", dto, vendedor), 409);
  await rejects(setup({ quotes: [] }).service.send("deal-1", dto, vendedor), 409);
  await rejects(setup().service.send("deal-1", dto, otro), 404);
});

test("sin configuración responde 503", async () => {
  const { service } = setup();
  const saved = env.WAVE_BILLING_URL;
  delete env.WAVE_BILLING_URL;
  try { await rejects(service.send("deal-1", dto, vendedor), 503); } finally { env.WAVE_BILLING_URL = saved; }
});

test("comprador no ofrecido responde 400", async () => {
  const { service } = setup({ ct: { ...contact, documentType: "CEDULA" } });
  await rejects(service.send("deal-1", { ...dto, buyer: "CONTACT" }, vendedor), 400);
});

test("envío exitoso: cuerpo, fila y auditoría", async () => {
  mockFetch(() => reply(200, ok));
  const { state, service } = setup();
  const view = await service.send("deal-1", dto, vendedor);
  const body = JSON.parse(calls[0].init.body);
  assert.equal(calls[0].url, "https://billing.test/api/v1/facturas");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(body.ventaId, "q1");
  assert.deepEqual([body.emisorId, body.sucursalId, body.ptoEmi, body.ambiente, body.preciosIncluyenIva, body.formaPago], ["emisor-1", "sucursal-1", "001", "1", false, "20"]);
  assert.equal(body.comprador.identificacion, "1792458123001");
  assert.equal(body.lineas[0].codigoPrincipal, "LIC");
  assert.equal(state.handoff.status, "AUTHORIZED");
  assert.equal(state.handoff.accessKey, ACCESS_KEY);
  assert.equal(state.handoff.sequential, "000000001");
  assert.equal(state.handoff.authorizationNumber, ACCESS_KEY);
  assert.equal(state.handoff.attempts, 1);
  assert.equal(view.quoteNumber, "COT-000001");
  assert.equal(view.invoiceNumber, "001-001-000000001");
  assert.deepEqual(state.audit.map((a) => [a.action, a.entityType, a.entityId, a.userId]), [["BILLING_SENT", "Deal", "deal-1", "user-1"]]);
  assert.deepEqual(state.audit[0].changes, { quoteNumber: "COT-000001", status: "AUTHORIZED", sequential: "000000001" });
  assert.ok(!everything(state.audit).includes(ACCESS_KEY));
});

test("fila ya autorizada: no llama a Billing", async () => {
  mockFetch(() => reply(200, ok));
  const { state, service } = setup();
  await service.send("deal-1", dto, vendedor);
  const again = await service.send("deal-1", dto, vendedor);
  assert.equal(calls.length, 1);
  assert.equal(again.status, "AUTHORIZED");
  assert.equal(state.audit.length, 1);
});

test("tiempo agotado deja FAILED y el reintento usa la misma ventaId", async () => {
  mockFetch(() => { throw new DOMException("https://billing.test " + KEY, "TimeoutError"); });
  const { state, service } = setup();
  const failed = await service.send("deal-1", dto, vendedor);
  assert.equal(failed.status, "FAILED");
  assert.deepEqual(failed.messages, ["No se pudo contactar a Wave Billing."]);
  assert.equal(state.audit[0].action, "BILLING_FAILED");
  assert.equal(state.deal.status, "WON");
  mockFetch(() => reply(200, ok));
  const retried = await service.send("deal-1", dto, vendedor);
  assert.equal(retried.status, "AUTHORIZED");
  assert.equal(retried.attempts, 2);
  assert.equal(JSON.parse(calls[0].init.body).ventaId, JSON.parse(calls[1].init.body).ventaId);
  assert.ok(!everything([failed, retried, state.audit]).includes(KEY));
});

test("400 de Billing guarda su mensaje; un 5xx es inalcanzable", async () => {
  mockFetch(() => reply(400, { message: "RUC inválido" }));
  const a = setup();
  const view = await a.service.send("deal-1", dto, vendedor);
  assert.equal(view.status, "FAILED");
  assert.deepEqual(view.messages, ["RUC inválido"]);
  assert.ok(!everything([view, a.state.audit]).includes(KEY));
  mockFetch(() => reply(503, { message: "caído" }));
  const b = await setup().service.send("deal-1", dto, vendedor);
  assert.deepEqual(b.messages, ["No se pudo contactar a Wave Billing."]);
});

test("un PENDING reciente responde 409; uno viejo se reclama", async () => {
  mockFetch(() => reply(200, ok));
  const pending = (updatedAt) => ({ id: "h1", quoteId: "q1", status: "PENDING", attempts: 0, messages: [], updatedAt });
  await rejects(setup({ handoff: pending(new Date()) }).service.send("deal-1", dto, vendedor), 409);
  const view = await setup({ handoff: pending(new Date(Date.now() - 3 * 60_000)) }).service.send("deal-1", dto, vendedor);
  assert.equal(view.status, "AUTHORIZED");
});

test("find entrega la entrega y las opciones de comprador", async () => {
  const { service } = setup();
  const found = await service.find("deal-1", vendedor);
  assert.equal(found.handoff, null);
  assert.deepEqual(found.buyer, { options: ["COMPANY"], default: "COMPANY" });
  assert.equal((await setup({ status: "OPEN" }).service.find("deal-1", vendedor)).handoff, null);
  await rejects(service.find("deal-1", otro), 404);
});
