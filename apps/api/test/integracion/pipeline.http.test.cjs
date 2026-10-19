const { before, after, test } = require("node:test");
const assert = require("node:assert/strict");
const { startApi } = require("./api.cjs");
const {
  cedulaDePrueba,
  createUser,
  PASSWORD,
  rucDePrueba,
} = require("../../../../test/datos-de-prueba.cjs");

let api,
  user,
  other,
  inactive,
  admin,
  adminToken,
  contact,
  token,
  pipeline,
  foreign,
  stage,
  won,
  foreignStage,
  company,
  deal;
const pipelines = [];
const call = (path, options = {}) => api.call(path, { ...options, token });
const asAdmin = (path, options = {}) => api.call(path, { ...options, token: adminToken });
// Hoy en Ecuador (UTC-5), como ecuadorToday() del API.
const today = new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10) + "T00:00:00.000Z";
const nextMonth = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10) + "T00:00:00.000Z";
const codes = (response) => (response.body.error?.errors ?? response.body.pending ?? []).map((p) => p.code);
before(async () => {
  api = await startApi();
  user = await createUser(api.prisma, { name: "Vendedor Pipeline" });
  other = await createUser(api.prisma, { name: "Responsable Pipeline" });
  inactive = await createUser(api.prisma, {
    name: "Inactivo Pipeline",
    active: false,
  });
  const login = await api.call("/auth/login", {
    method: "POST",
    body: { email: user.email, password: PASSWORD },
  });
  assert.equal(login.status, 200);
  token = login.body.accessToken;
  admin = await createUser(api.prisma, { name: "Admin Pipeline", role: "ADMIN" });
  const adminLogin = await api.call("/auth/login", {
    method: "POST",
    body: { email: admin.email, password: PASSWORD },
  });
  assert.equal(adminLogin.status, 200);
  adminToken = adminLogin.body.accessToken;
  contact = await api.prisma.contact.create({
    data: {
      firstName: "Ana",
      lastName: "Requisitos",
      documentType: "CEDULA",
      documentId: cedulaDePrueba(),
      email: "ana.requisitos@example.com",
      ownerId: user.id,
    },
  });
  company = await api.prisma.company.create({
    data: { name: "Empresa Pipeline", taxId: rucDePrueba(), ownerId: user.id },
  });
});
after(async () => {
  if (!api) return;
  const dealIds = (
    await api.prisma.deal.findMany({
      where: { pipelineId: { in: pipelines } },
      select: { id: true },
    })
  ).map((d) => d.id);
  if (deal) dealIds.push(deal);
  await api.prisma.auditLog.deleteMany({
    where: { entityType: "Deal", entityId: { in: dealIds } },
  });
  for (const id of pipelines) {
    await api.prisma.deal.deleteMany({ where: { pipelineId: id } });
  }
  for (const id of pipelines)
    await api.prisma.pipeline.deleteMany({ where: { id } });
  if (contact) await api.prisma.contact.deleteMany({ where: { id: contact.id } });
  if (company)
    await api.prisma.company.deleteMany({ where: { id: company.id } });
  const ids = [user, other, inactive, admin].filter(Boolean).map((u) => u.id);
  await api.prisma.user.deleteMany({ where: { id: { in: ids } } });
  await api.close();
});
test("pipeline exige autenticacion y expone solo responsables activos a vendedores", async () => {
  assert.equal((await api.call("/pipelines")).status, 401);
  assert.equal((await api.call("/deals/board")).status, 401);
  const owners = await call("/pipeline/owners");
  assert.equal(owners.status, 200);
  assert.ok(owners.body.some((o) => o.id === other.id));
  assert.ok(!owners.body.some((o) => o.id === inactive.id));
  assert.ok(
    owners.body.every((o) => Object.keys(o).sort().join() === "id,name"),
  );
});
test("configura pipelines y etapas y rechaza probabilidades invalidas", async () => {
  for (const name of ["Pipeline Prueba", "Pipeline Alterno"]) {
    const created = await call("/pipelines", {
      method: "POST",
      body: { name },
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    pipelines.push(created.body.id);
  }
  [pipeline, foreign] = pipelines;
  const a = await call("/pipelines/" + pipeline + "/stages", {
    method: "POST",
    body: { name: "Inicial", position: 0, probability: 10, color: "#2f6f8f" },
  });
  const b = await call("/pipelines/" + pipeline + "/stages", {
    method: "POST",
    body: { name: "Ganado", position: 1, probability: 100 },
  });
  const c = await call("/pipelines/" + foreign + "/stages", {
    method: "POST",
    body: { name: "Otra", position: 0, probability: 10 },
  });
  assert.equal(a.status, 201);
  assert.equal(b.status, 201);
  assert.equal(c.status, 201);
  stage = a.body.id;
  won = b.body.id;
  foreignStage = c.body.id;
  assert.equal(
    (
      await call("/stages/" + stage, {
        method: "PATCH",
        body: { probability: 101 },
      })
    ).status,
    400,
  );
  const swap = await call("/stages/" + won, {
    method: "PATCH",
    body: { position: 0 },
  });
  assert.equal(swap.status, 200, JSON.stringify(swap.body));
  const all = await call("/pipelines");
  const ordered = all.body.find((p) => p.id === pipeline).stages;
  assert.deepEqual(
    ordered.map((s) => s.id),
    [won, stage],
  );
  assert.equal(
    (
      await call("/pipelines/" + foreign, {
        method: "PATCH",
        body: { name: "Otro embudo" },
      })
    ).status,
    200,
  );
});
test("alta real persiste negocio USD y su historial en la misma transaccion", async () => {
  const created = await call("/deals", {
    method: "POST",
    body: {
      title: "Contrato real",
      value: 120.55,
      pipelineId: pipeline,
      stageId: stage,
      companyId: company.id,
      expectedClose: "2026-10-22T00:00:00.000Z",
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  deal = created.body.id;
  assert.equal(created.body.currency, "USD");
  assert.equal(created.body.value, "120.55");
  assert.equal(created.body.owner.id, user.id);
  assert.equal(created.body.expectedClose, "2026-10-22T00:00:00.000Z");
  const history = await call("/deals/" + deal + "/history");
  assert.equal(history.body.length, 1);
  assert.equal(history.body[0].fromStageId, null);
  assert.equal(history.body[0].changedById, user.id);
});
test("rechaza fechas, montos, relaciones y responsables invalidos sin altas parciales", async () => {
  const base = {
    title: "Validacion",
    value: 20,
    pipelineId: pipeline,
    stageId: stage,
    companyId: company.id,
  };
  for (const extra of [
    { value: -1 },
    { value: 1.001 },
    { expectedClose: "no-fecha" },
    { expectedClose: "2026-02-31" },
    { title: "   " },
    { stageId: foreignStage },
    { ownerId: inactive.id },
    { companyId: null },
  ]) {
    const result = await call("/deals", {
      method: "POST",
      body: { ...base, ...extra },
    });
    assert.equal(result.status, 400, JSON.stringify(result.body));
  }
  assert.equal(
    (
      await call("/deals", {
        method: "POST",
        body: { ...base, companyId: "missing-company" },
      })
    ).status,
    409,
  );
  assert.equal(
    await api.prisma.deal.count({ where: { pipelineId: pipeline } }),
    1,
  );
});
test("CRM-20: productos recalculan el valor y rechazan filas invalidas sin guardar", async () => {
  const items = [
    { description: "Pagina web", quantity: 1, unitPrice: 100.55, taxRate: 15 },
    { description: "Hosting", quantity: 2, unitPrice: 10, taxRate: 0 },
  ];
  for (const bad of [
    [{ ...items[0], quantity: 0 }],
    [{ ...items[0], taxRate: 101 }],
    [{ ...items[0], taxRate: 12.5 }],
    [{ ...items[0], description: " " }],
    [{ ...items[0], color: "rojo" }],
    Array.from({ length: 101 }, () => items[1]),
  ]) {
    const rejected = await call("/deals/" + deal + "/items", {
      method: "PUT",
      body: { items: bad },
    });
    assert.equal(rejected.status, 400, JSON.stringify(rejected.body));
    assert.ok(!/Solicitud inválida/.test(JSON.stringify(rejected.body)));
  }
  const tooPricey = await call("/deals/" + deal + "/items", {
    method: "PUT",
    body: { items: [{ ...items[0], unitPrice: 1e12 }] },
  });
  assert.equal(tooPricey.status, 400);
  assert.match(JSON.stringify(tooPricey.body), /El precio máximo es/);
  assert.equal(await api.prisma.dealItem.count({ where: { dealId: deal } }), 0);
  const saved = await call("/deals/" + deal + "/items", {
    method: "PUT",
    body: { items },
  });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.equal(saved.body.value, "120.55");
  assert.deepEqual(
    saved.body.items.map((i) => [i.description, i.quantity, i.position]),
    [
      ["Pagina web", "1", 0],
      ["Hosting", "2", 1],
    ],
  );
  const manual = await call("/deals/" + deal, {
    method: "PATCH",
    body: { value: 5 },
  });
  assert.equal(manual.status, 400);
  const board = await call("/deals/board?pipelineId=" + pipeline);
  const card = board.body.stages
    .flatMap((s) => s.deals)
    .find((d) => d.id === deal);
  assert.equal(card._count.items, 2);
});
test("ambas rutas de movimiento exigen la propuesta aceptada, registran historial y solo ADMIN reabre", async () => {
  const path = "/deals/" + deal;
  const blocked = await call(path + "/move", { method: "PATCH", body: { stageId: won } });
  assert.equal(blocked.status, 422, JSON.stringify(blocked.body));
  assert.deepEqual(codes(blocked), ["ACCEPTANCE", "CLOSED_AT"]);
  const proposal = await call(path + "/quotes", { method: "POST", body: { validUntil: nextMonth } });
  assert.equal(proposal.status, 201, JSON.stringify(proposal.body));
  const [sent] = proposal.body.quotes;
  assert.match(sent.number, /^COT-\d{6}$/);
  assert.deepEqual([sent.status, sent.total], ["SENT", "135.63"]);
  const accepted = await call(path + "/quotes/" + sent.id + "/accept", {
    method: "POST",
    body: { acceptedAt: today, acceptanceNote: "Orden de compra 55 por correo" },
  });
  assert.equal(accepted.status, 200, JSON.stringify(accepted.body));
  const moved = await call(path + "/move", {
    method: "PATCH",
    body: { stageId: won, fromStageId: stage, closedAt: today },
  });
  assert.equal(moved.status, 200, JSON.stringify(moved.body));
  assert.equal(moved.body.status, "WON");
  assert.equal(moved.body.closedAt, today);
  assert.deepEqual(
    (await api.prisma.quote.findMany({ where: { dealId: deal } })).map((q) => q.status),
    ["ACCEPTED"],
  );
  await call(path + "/move", { method: "PATCH", body: { stageId: won } });
  assert.equal((await call(path + "/history")).body.length, 2);
  assert.equal(
    (await call(path, { method: "PATCH", body: { stageId: stage, ownerId: other.id } })).status,
    403,
  );
  assert.equal(
    (await asAdmin(path + "/move", { method: "PATCH", body: { stageId: stage } })).status,
    422,
  );
  const reopened = await asAdmin(path + "/move", {
    method: "PATCH",
    body: { stageId: stage, reason: "El cliente pidió ajustar la propuesta" },
  });
  assert.equal(reopened.status, 200, JSON.stringify(reopened.body));
  assert.equal(reopened.body.status, "OPEN");
  assert.equal(reopened.body.closedAt, null);
  assert.equal(await api.prisma.quote.count({ where: { dealId: deal } }), 1);
  const history = (await call(path + "/history")).body;
  assert.equal(history.length, 3);
  assert.deepEqual(
    [history[0].fromStageId, history[0].toStageId, history[0].reason],
    [won, stage, "El cliente pidió ajustar la propuesta"],
  );
  assert.equal((await call(path, { method: "PATCH", body: { title: null } })).status, 400);
});
test("cierres: ganar con la propuesta aceptada, perder con motivo y reabrir solo ADMIN, con auditoría", async () => {
  const future = new Date(Date.now() + 3 * 864e5).toISOString();
  const path = "/deals/" + deal;
  const tooSoon = await call(path + "/win", { method: "POST", body: { closedAt: future } });
  assert.equal(tooSoon.status, 422);
  assert.deepEqual(codes(tooSoon), ["CLOSED_AT"]);
  assert.equal((await call(path + "/win", { method: "POST", body: {} })).status, 400);
  const wonDeal = await call(path + "/win", { method: "POST", body: { closedAt: today } });
  assert.equal(wonDeal.status, 200, JSON.stringify(wonDeal.body));
  assert.equal(wonDeal.body.status, "WON");
  assert.equal(wonDeal.body.stage.id, won);
  const [quote] = wonDeal.body.quotes;
  assert.deepEqual(
    [quote.status, quote.subtotal, quote.tax, quote.total, wonDeal.body.quotes.length],
    ["ACCEPTED", "120.55", "15.08", "135.63", 1],
  );
  assert.equal((await call(path + "/items", { method: "PUT", body: { items: [] } })).status, 409);
  // Un ganado es terminal: el VENDEDOR no puede tocarlo (403) y ni el ADMIN lo pierde sin reabrirlo (409).
  assert.equal(
    (await call(path + "/lose", { method: "POST", body: { lossReason: "PRICE" } })).status,
    403,
  );
  assert.equal(
    (await asAdmin(path + "/lose", { method: "POST", body: { lossReason: "PRICE" } })).status,
    409,
  );
  assert.equal((await call(path + "/reopen", { method: "POST", body: { reason: "Error" } })).status, 403);
  assert.equal((await asAdmin(path + "/reopen", { method: "POST", body: {} })).status, 400);
  const reopened = await asAdmin(path + "/reopen", { method: "POST", body: { reason: "Anuló la orden" } });
  assert.equal(reopened.status, 200, JSON.stringify(reopened.body));
  assert.equal(reopened.body.status, "OPEN");
  assert.equal(reopened.body.stage.id, stage);
  assert.equal(reopened.body.quotes.length, 1);
  for (const body of [{}, { lossReason: "OTHER" }, { lossReason: "CARO" }]) {
    const rejected = await call(path + "/lose", { method: "POST", body });
    assert.equal(rejected.status, 400, JSON.stringify(rejected.body));
  }
  const lost = await call(path + "/lose", {
    method: "POST",
    body: { lossReason: "OTHER", lossDetail: "Cerro el local" },
  });
  assert.equal(lost.status, 200);
  assert.deepEqual(
    [lost.body.status, lost.body.lossReason, lost.body.lossDetail, lost.body.stage.id],
    ["LOST", "OTHER", "Cerro el local", stage],
  );
  assert.ok(lost.body.closedAt);
  const board = (await call("/deals/board?pipelineId=" + pipeline)).body;
  assert.deepEqual([board.lost.count, board.metrics.open.count, board.metrics.lost.value], [1, 0, "120.55"]);
  assert.equal(board.stages.find((s) => s.id === stage).count, 0);
  const open = await asAdmin(path + "/reopen", { method: "POST", body: { reason: "Volvió a escribir" } });
  assert.deepEqual([open.body.status, open.body.lossReason], ["OPEN", null]);
  assert.deepEqual(
    open.body.closures.map((c) => c.action).slice(0, 4),
    ["REOPENED", "LOST", "REOPENED", "WON"],
  );
  assert.equal(open.body.closures[0].changes.reason, "Volvió a escribir");
  const direct = await call("/deals", {
    method: "POST",
    body: { title: "Directo a ganado", value: 1, pipelineId: pipeline, stageId: won, companyId: company.id },
  });
  assert.equal(direct.status, 400);
});
test("recorrido con requisitos: Contactado → Negociación → Propuesta con datos reales, saltos y retrocesos", async () => {
  const created = await call("/pipelines", { method: "POST", body: { name: "Pipeline Requisitos" } });
  assert.equal(created.status, 201);
  const flow = created.body.id;
  pipelines.push(flow);
  const stageBody = (name, position, probability, requirements) => ({
    method: "POST",
    body: { name, position, probability, requirements },
  });
  const negotiationRules = ["CONTACT", "OWNER", "INTERACTION", "NEED", "NEXT_ACTIVITY"];
  assert.equal(
    (await call("/pipelines/" + flow + "/stages", stageBody("Negociación", 1, 45, negotiationRules))).status,
    403,
  );
  const contacted = (await asAdmin("/pipelines/" + flow + "/stages", stageBody("Contactado", 0, 15, []))).body.id;
  const negotiation = (await asAdmin("/pipelines/" + flow + "/stages", stageBody("Negociación", 1, 45, negotiationRules))).body.id;
  const proposalStage = (
    await asAdmin(
      "/pipelines/" + flow + "/stages",
      stageBody("Propuesta", 2, 70, ["SOLUTION", "BUDGET", "PROPOSAL_SENT", "EXPECTED_CLOSE"]),
    )
  ).body.id;
  assert.equal(
    (await call("/stages/" + negotiation, { method: "PATCH", body: { name: "Negociación", requirements: [...negotiationRules].reverse() } })).status,
    200,
  );
  const fresh = await call("/deals", {
    method: "POST",
    body: { title: "Tienda en línea", value: 0, pipelineId: flow, stageId: contacted, companyId: company.id },
  });
  assert.equal(fresh.status, 201, JSON.stringify(fresh.body));
  const id = fresh.body.id;
  const path = "/deals/" + id;
  const preview = await call(path + "/transition?to=" + negotiation);
  assert.deepEqual(codes(preview), ["CONTACT", "INTERACTION", "NEED", "NEXT_ACTIVITY"]);
  const blocked = await call(path + "/move", { method: "PATCH", body: { stageId: negotiation, fromStageId: contacted } });
  assert.equal(blocked.status, 422);
  assert.deepEqual(codes(blocked), ["CONTACT", "INTERACTION", "NEED", "NEXT_ACTIVITY"]);
  assert.equal(await api.prisma.dealStageHistory.count({ where: { dealId: id } }), 1);
  assert.equal((await call(path, { method: "PATCH", body: { contactId: contact.id, need: "Vender en línea" } })).status, 200);
  const interaction = await call(path + "/activities", {
    method: "POST",
    body: { type: "CALL", subject: "Primera llamada", completedAt: today },
  });
  assert.equal(interaction.body.status, "COMPLETED");
  await call(path + "/activities", { method: "POST", body: { type: "MEETING", subject: "Demo", dueAt: nextMonth } });
  const advanced = await call(path + "/move", { method: "PATCH", body: { stageId: negotiation, fromStageId: contacted } });
  assert.equal(advanced.status, 200, JSON.stringify(advanced.body));
  assert.deepEqual(codes(await call(path + "/move", { method: "PATCH", body: { stageId: proposalStage } })), [
    "SOLUTION",
    "BUDGET",
    "EXPECTED_CLOSE",
    "PROPOSAL_SENT",
  ]);
  await call(path, {
    method: "PATCH",
    body: { solution: "Plan anual", budgetNote: "Lo aprueba el directorio", expectedClose: nextMonth, decisionMaker: "Gerente" },
  });
  await call(path + "/items", {
    method: "PUT",
    body: { items: [{ description: "Plan anual", quantity: 1, unitPrice: 1000, taxRate: 15 }] },
  });
  await call(path + "/quotes", { method: "POST", body: { validUntil: nextMonth } });
  assert.equal((await call(path + "/move", { method: "PATCH", body: { stageId: proposalStage } })).status, 200);
  assert.deepEqual(codes(await call(path + "/move", { method: "PATCH", body: { stageId: contacted } })), ["REASON"]);
  const back = await call(path + "/move", {
    method: "PATCH",
    body: { stageId: contacted, reason: "Esperar el presupuesto", fromStageId: proposalStage },
  });
  assert.equal(back.status, 200);
  assert.deepEqual(
    [back.body.need, back.body.solution, back.body.quotes[0].status],
    ["Vender en línea", "Plan anual", "SENT"],
  );
  const jump = await call(path + "/move", { method: "PATCH", body: { stageId: proposalStage, fromStageId: contacted } });
  assert.equal(jump.status, 200, JSON.stringify(jump.body));
  const latest = await api.prisma.dealStageHistory.findFirst({ where: { dealId: id }, orderBy: { changedAt: "desc" } });
  assert.deepEqual([latest.fromStageId, latest.toStageId], [contacted, proposalStage]);
  const race = await Promise.all(
    [1, 2].map(() =>
      call(path + "/move", {
        method: "PATCH",
        body: { stageId: negotiation, fromStageId: proposalStage, reason: "Revisar la oferta" },
      }),
    ),
  );
  assert.deepEqual(race.map((r) => r.status).sort(), [200, 409]);
  const iva = await call(path + "/items", {
    method: "PUT",
    body: { items: [{ description: "Plan anual", quantity: 1, unitPrice: 1000, taxRate: 12 }] },
  });
  assert.equal(iva.status, 200);
  assert.deepEqual(
    [iva.body.items[0].taxRate, iva.body.quotes[0].status],
    [12, "SUPERSEDED"],
  );
  const page = await call("/deals/board?pipelineId=" + flow + "&column=" + negotiation + "&page=1");
  assert.deepEqual(page.body.deals.map((d) => d.id), [id]);
});
test("CRM-20: registra y completa actividades del negocio una sola vez", async () => {
  const path = "/deals/" + deal + "/activities";
  assert.equal(
    (await call(path, { method: "POST", body: { type: "FAX", subject: "x" } })).status,
    400,
  );
  const created = await call(path, {
    method: "POST",
    body: { type: "CALL", subject: "Llamar al cliente", dueAt: "2026-10-12T00:00:00.000Z" },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.companyId, company.id);
  assert.equal(created.body.assignee.id, user.id);
  const done = await call(path + "/" + created.body.id + "/complete", { method: "PATCH" });
  assert.equal(done.status, 200);
  assert.equal(done.body.status, "COMPLETED");
  assert.equal(
    (await call(path + "/" + created.body.id + "/complete", { method: "PATCH" })).status,
    409,
  );
  const detail = await call("/deals/" + deal);
  assert.equal(detail.body.activities[0].subject, "Llamar al cliente");
});
test("lectura, paginacion, metricas decimales y conflictos de borrado", async () => {
  const list = await call("/deals?pipelineId=" + pipeline + "&limit=1");
  assert.equal(list.status, 200);
  assert.equal(list.body.meta.total, 1);
  const single = await call("/deals/" + deal);
  assert.equal(single.body.company.id, company.id);
  const board = await call("/deals/board?pipelineId=" + pipeline);
  assert.equal(board.status, 200);
  assert.equal(board.body.stages.find((s) => s.id === stage).value, "120.55");
  assert.deepEqual(board.body.metrics.open, { count: 1, value: "120.55" });
  assert.equal(
    (await call("/stages/" + won, { method: "DELETE" })).status,
    409,
  );
  assert.equal(
    (await call("/pipelines/" + pipeline, { method: "DELETE" })).status,
    409,
  );
});
test("eliminar negocio libera su historial y permite eliminar el pipeline vacio", async () => {
  assert.equal(
    (await call("/deals/" + deal, { method: "DELETE" })).status,
    200,
  );
  assert.equal(
    await api.prisma.dealStageHistory.count({ where: { dealId: deal } }),
    0,
  );
  assert.equal((await call("/deals/" + deal)).status, 404);
  assert.equal(
    (await call("/stages/" + won, { method: "DELETE" })).status,
    200,
  );
  assert.equal(
    (await call("/pipelines/" + pipeline, { method: "DELETE" })).status,
    200,
  );
});
