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
      findUnique: async () => state.handoff && { ...state.handoff },
      create: async ({ data }) => (state.handoff = { id: "h1", attempts: 0, messages: [], accessKey: null, sequential: null, authorizationNumber: null, authorizedAt: null, ...data, updatedAt: new Date() }),
      updateMany: async ({ where, data }) => {
        const h = state.handoff;
        const ok = h && where.OR.some((c) => (c.status.in ? c.status.in.includes(h.status) : c.status === h.status && h.updatedAt < c.updatedAt.lt));
        if (ok) Object.assign(h, data, { updatedAt: new Date() });
        return { count: ok ? 1 : 0 };
      },
      update: async ({ data }) => {
        const { attempts, ...rest } = data;
        Object.assign(state.handoff, rest, { attempts: state.handoff.attempts + (attempts?.increment ?? 0) });
        return state.handoff;
      },
    },
    auditLog: { create: async ({ data }) => state.audit.push(data) },
  };
  const service = new BillingService(prisma, { get: (k) => env[k] });
  return { state, service, prisma };
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
  assert.ok(!everything([view, state.audit]).includes(KEY));
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

const row = (status, extra = {}) => ({ id: "h1", quoteId: "q1", status, buyer: {}, paymentMethod: "20", attempts: 1, messages: [], accessKey: ACCESS_KEY, sequential: "000000001", updatedAt: new Date(), ...extra });
const NEW_KEY = "2011202601172391437800110010010000000021234567810";

test("claim: otra petición ya entregó la fila, se devuelve sin 409", async () => {
  mockFetch(() => reply(200, ok));
  const { state, service, prisma } = setup({ handoff: row("FAILED") });
  prisma.billingHandoff.updateMany = async () => { Object.assign(state.handoff, { status: "AUTHORIZED" }); return { count: 0 }; };
  const view = await service.send("deal-1", dto, vendedor);
  assert.equal(view.status, "AUTHORIZED");
  assert.equal(calls.length, 0);
});

test("primera creación simultánea (P2002) responde 409", async () => {
  mockFetch(() => reply(200, ok));
  const { service, prisma } = setup();
  prisma.billingHandoff.create = async () => { throw Object.assign(new Error("dup"), { code: "P2002" }); };
  await rejects(service.send("deal-1", dto, vendedor), 409);
});

test("4xx sin cuerpo y mensaje no textual", async () => {
  mockFetch(() => new Response("", { status: 422 }));
  assert.deepEqual((await setup().service.send("deal-1", dto, vendedor)).messages, ["Wave Billing respondió 422."]);
  mockFetch(() => reply(400, { message: { campo: "ruc" } }));
  assert.deepEqual((await setup().service.send("deal-1", dto, vendedor)).messages, ['{"campo":"ruc"}']);
});

test("refresh: SENT pasa a AUTHORIZED y audita; 404 deja la fila; AUTHORIZED 409", async () => {
  mockFetch(() => reply(200, ok));
  const a = setup({ handoff: row("SENT") });
  const view = await a.service.refresh("deal-1", vendedor);
  assert.equal(calls[0].url, "https://billing.test/api/v1/facturas/por-venta/q1?emisorId=emisor-1&ambiente=1");
  assert.equal(calls[0].init.headers["x-api-key"], KEY);
  assert.equal(view.status, "AUTHORIZED");
  assert.deepEqual(a.state.audit.map((x) => x.action), ["BILLING_STATUS"]);
  mockFetch(() => reply(404, { message: "no existe" }));
  const b = setup({ handoff: row("FAILED") });
  assert.equal((await b.service.refresh("deal-1", vendedor)).status, "FAILED");
  assert.equal(b.state.audit.length, 0);
  await rejects(setup({ handoff: row("AUTHORIZED") }).service.refresh("deal-1", vendedor), 409);
  await rejects(setup().service.refresh("deal-1", vendedor), 409);
  mockFetch(() => reply(200, { ...ok, estado: "ENVIADA" }));
  const c = setup({ handoff: row("SENT") });
  await c.service.refresh("deal-1", vendedor);
  assert.equal(c.state.audit.length, 0);
});

test("reissue: comprador actual, nueva clave y auditoría; AUTHORIZED 409", async () => {
  mockFetch(() => reply(200, { ...ok, claveAcceso: NEW_KEY, secuencial: "000000002" }));
  const a = setup({ handoff: row("RETURNED"), co: { ...company, legalName: "NUEVA S.A." } });
  const view = await a.service.reissue("deal-1", { buyer: "COMPANY" }, vendedor);
  assert.equal(calls[0].url, `https://billing.test/api/v1/facturas/${ACCESS_KEY}/reemitir`);
  assert.equal(JSON.parse(calls[0].init.body).comprador.razonSocial, "NUEVA S.A.");
  assert.equal(view.accessKey, NEW_KEY);
  assert.equal(view.sequential, "000000002");
  assert.deepEqual(a.state.audit.map((x) => [x.action, x.changes.previousAccessKey, x.changes.accessKey]), [["BILLING_REISSUED", ACCESS_KEY, NEW_KEY]]);
  await rejects(setup({ handoff: row("AUTHORIZED") }).service.reissue("deal-1", { buyer: "COMPANY" }, vendedor), 409);
  await rejects(setup({ handoff: row("RETURNED"), co: null }).service.reissue("deal-1", { buyer: "COMPANY" }, vendedor), 400);
});

test("reissue fallido restaura el estado anterior", async () => {
  mockFetch(() => reply(400, { message: "RUC inválido" }));
  const a = setup({ handoff: row("RETURNED") });
  await rejects(a.service.reissue("deal-1", { buyer: "COMPANY" }, vendedor), 422);
  assert.equal(a.state.handoff.status, "RETURNED");
});

test("dos reissue simultáneos: el segundo recibe 409", async () => {
  let release;
  mockFetch(() => new Promise((resolve) => (release = () => resolve(reply(200, ok)))));
  const { service } = setup({ handoff: row("RETURNED") });
  const first = service.reissue("deal-1", { buyer: "COMPANY" }, vendedor);
  await new Promise((r) => setTimeout(r, 10));
  await assert.rejects(service.reissue("deal-1", { buyer: "COMPANY" }, vendedor), (e) => e.getStatus() === 409 && e.message === "Ya se está enviando.");
  release();
  assert.equal((await first).status, "AUTHORIZED");
});

test("email: solo AUTHORIZED; con y sin correo; audita", async () => {
  mockFetch(() => reply(200, {}));
  const a = setup({ handoff: row("AUTHORIZED") });
  await a.service.email("deal-1", { email: "x@y.ec" }, vendedor);
  await a.service.email("deal-1", {}, vendedor);
  assert.equal(calls[0].url, `https://billing.test/api/v1/facturas/${ACCESS_KEY}/enviar-correo`);
  assert.deepEqual([JSON.parse(calls[0].init.body), JSON.parse(calls[1].init.body)], [{ email: "x@y.ec" }, {}]);
  assert.deepEqual(a.state.audit.map((x) => [x.action, x.changes.email]), [["BILLING_EMAILED", "x@y.ec"], ["BILLING_EMAILED", undefined]]);
  await rejects(setup({ handoff: row("RETURNED") }).service.email("deal-1", {}, vendedor), 409);
});

test("file: ride y xml devuelven los bytes", async () => {
  mockFetch(() => new Response(new Uint8Array([1, 2, 3]), { status: 200 }));
  const { service } = setup({ handoff: row("RETURNED") });
  const ride = await service.file("deal-1", "ride", vendedor);
  assert.equal(calls[0].url, `https://billing.test/api/v1/facturas/${ACCESS_KEY}/ride.pdf`);
  assert.equal(calls[0].init.headers["x-api-key"], KEY);
  assert.deepEqual([...ride.data], [1, 2, 3]);
  assert.deepEqual([ride.type, ride.name], ["application/pdf", `${ACCESS_KEY}.pdf`]);
  const xml = await service.file("deal-1", "xml", vendedor);
  assert.equal(calls[1].url, `https://billing.test/api/v1/facturas/${ACCESS_KEY}/xml`);
  assert.deepEqual([xml.type, xml.name], ["application/xml", `${ACCESS_KEY}.xml`]);
});

test("file: errores y alcance", async () => {
  mockFetch(() => reply(200, {}));
  await assert.rejects(setup({ handoff: row("FAILED", { accessKey: null }) }).service.file("deal-1", "ride", vendedor), (e) => e.getStatus() === 409 && e.message === "Aún no hay factura en Wave Billing.");
  await rejects(setup().service.file("deal-1", "xml", vendedor), 409);
  mockFetch(() => reply(404, {}));
  await assert.rejects(setup({ handoff: row("RETURNED") }).service.file("deal-1", "ride", vendedor), (e) => e.getStatus() === 404 && e.message === "Wave Billing no encontró la factura.");
  mockFetch(() => { throw new Error("https://billing.test " + KEY); });
  await assert.rejects(setup({ handoff: row("RETURNED") }).service.file("deal-1", "ride", vendedor), (e) => e.getStatus() === 502 && e.message === "No se pudo contactar a Wave Billing.");
  calls = [];
  await rejects(setup({ handoff: row("RETURNED") }).service.file("deal-1", "ride", otro), 404);
  assert.equal(calls.length, 0);
});
