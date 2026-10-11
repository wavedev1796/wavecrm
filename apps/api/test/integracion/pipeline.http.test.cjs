const { before, after, test } = require("node:test");
const assert = require("node:assert/strict");
const { startApi } = require("./api.cjs");
const {
  createUser,
  PASSWORD,
  rucDePrueba,
} = require("../../../../test/datos-de-prueba.cjs");

let api,
  user,
  other,
  inactive,
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
  if (company)
    await api.prisma.company.deleteMany({ where: { id: company.id } });
  const ids = [user, other, inactive].filter(Boolean).map((u) => u.id);
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
    [{ ...items[0], taxRate: 12 }],
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
test("ambas rutas de movimiento registran historial, reabren y evitan duplicados", async () => {
  const moved = await call("/deals/" + deal + "/move", {
    method: "PATCH",
    body: { stageId: won },
  });
  assert.equal(moved.status, 200);
  assert.equal(moved.body.status, "WON");
  assert.ok(moved.body.closedAt);
  await call("/deals/" + deal + "/move", {
    method: "PATCH",
    body: { stageId: won },
  });
  assert.equal((await call("/deals/" + deal + "/history")).body.length, 2);
  const reopened = await call("/deals/" + deal, {
    method: "PATCH",
    body: { stageId: stage, ownerId: other.id },
  });
  assert.equal(reopened.status, 200);
  assert.equal(reopened.body.status, "OPEN");
  assert.equal(reopened.body.closedAt, null);
  assert.equal(reopened.body.owner.id, other.id);
  const history = (await call("/deals/" + deal + "/history")).body;
  assert.equal(history.length, 3);
  assert.equal(history[0].fromStageId, won);
  assert.equal(history[0].toStageId, stage);
  assert.equal(
    (await call("/deals/" + deal, { method: "PATCH", body: { title: null } }))
      .status,
    400,
  );
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
