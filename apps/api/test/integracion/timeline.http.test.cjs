// CRM-25: línea de tiempo por negocio y por contacto contra la rama "pruebas".
const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const { PASSWORD, cedulaDePrueba, cleanup, createUser } = require("../../../../test/datos-de-prueba.cjs");
const { startApi } = require("./api.cjs");

let api, admin, seller, adminToken, sellerToken, pipeline, contact, deal;
const T = new Date("2026-10-30T15:00:00.000Z");
const login = async (user) =>
  (await api.call("/auth/login", { method: "POST", body: { email: user.email, password: PASSWORD } })).body.accessToken;
const asAdmin = (path) => api.call(path, { token: adminToken });
const asSeller = (path) => api.call(path, { token: sellerToken });

before(async () => {
  api = await startApi();
  admin = await createUser(api.prisma, { name: "Admin Línea", role: "ADMIN" });
  seller = await createUser(api.prisma, { name: "Vendedor Línea" });
  [adminToken, sellerToken] = [await login(admin), await login(seller)];
  pipeline = await api.prisma.pipeline.create({
    data: { name: "Pipeline Línea", stages: { create: { name: "Inicial", position: 0, probability: 10 } } },
    include: { stages: true },
  });
  const stage = pipeline.stages[0];
  contact = await api.prisma.contact.create({
    data: {
      firstName: "Lía",
      lastName: "Línea",
      documentType: "CEDULA",
      documentId: cedulaDePrueba(),
      email: "lia.linea@example.com",
      ownerId: admin.id,
    },
  });
  deal = await api.prisma.deal.create({
    data: { title: "Negocio Línea", value: 0, pipelineId: pipeline.id, stageId: stage.id, contactId: contact.id, ownerId: admin.id },
  });
  // Varios eventos en el mismo instante: el desempate por id decide el orden.
  for (const subject of ["Uno", "Dos", "Tres"])
    await api.prisma.activity.create({
      data: { type: "CALL", subject, dealId: deal.id, contactId: contact.id, createdById: admin.id, assigneeId: seller.id, createdAt: T },
    });
  await api.prisma.activity.create({
    data: { type: "TASK", subject: "Solo del contacto", contactId: contact.id, assigneeId: seller.id, createdAt: T },
  });
  await api.prisma.dealStageHistory.create({
    data: { dealId: deal.id, toStageId: stage.id, changedById: admin.id, changedAt: T },
  });
  await api.prisma.auditLog.create({
    data: { action: "WON", entityType: "Deal", entityId: deal.id, userId: admin.id, changes: { closedAt: T.toISOString() }, createdAt: T },
  });
});

after(async () => {
  if (!api) return;
  if (deal) {
    await api.prisma.auditLog.deleteMany({ where: { entityType: "Deal", entityId: deal.id } });
    await api.prisma.deal.deleteMany({ where: { id: deal.id } });
  }
  if (contact) await api.prisma.activity.deleteMany({ where: { contactId: contact.id } });
  if (pipeline) await api.prisma.pipeline.deleteMany({ where: { id: pipeline.id } });
  await cleanup(api.prisma);
  await api.close();
});

test("la línea de tiempo exige token y oculta a un VENDEDOR lo que no tiene a su cargo", async () => {
  assert.equal((await api.call("/deals/" + deal.id + "/timeline")).status, 401);
  assert.equal((await api.call("/contacts/" + contact.id + "/timeline")).status, 401);
  const hidden = await asSeller("/deals/" + deal.id + "/timeline");
  assert.deepEqual([hidden.status, hidden.body.error.message], [404, "Negocio no encontrado."]);
  const other = await asSeller("/contacts/" + contact.id + "/timeline");
  assert.deepEqual([other.status, other.body.error.message], [404, "Contacto no encontrado."]);
  // El historial del tablero aplica el mismo alcance.
  assert.equal((await asSeller("/deals/" + deal.id + "/history")).status, 404);
  assert.equal((await asAdmin("/deals/" + deal.id + "/history")).status, 200);
});

test("ADMIN pagina eventos del mismo instante sin repetir ni omitir", async () => {
  const all = await asAdmin("/deals/" + deal.id + "/timeline?limit=50");
  assert.equal(all.status, 200, JSON.stringify(all.body));
  assert.deepEqual(all.body.meta, { limit: 50, nextCursor: null });
  const expected = all.body.data.map((e) => e.id);
  assert.equal(expected.length, 5);
  assert.deepEqual(all.body.data.map((e) => e.kind), ["STAGE", "EVENT", "ACTIVITY", "ACTIVITY", "ACTIVITY"]);
  assert.ok(all.body.data.every((e) => e.at === T.toISOString() && e.author?.id === admin.id));
  const ids = [];
  let cursor = "";
  do {
    const page = await asAdmin("/deals/" + deal.id + "/timeline?limit=2" + (cursor && "&cursor=" + cursor));
    assert.equal(page.status, 200, JSON.stringify(page.body));
    ids.push(...page.body.data.map((e) => e.id));
    cursor = page.body.meta.nextCursor;
  } while (cursor);
  assert.deepEqual(ids, expected);
});

test("contacto: incluye sus negocios y lo suyo sin negocio; valida cursor y límite", async () => {
  const response = await asAdmin("/contacts/" + contact.id + "/timeline");
  assert.equal(response.status, 200, JSON.stringify(response.body));
  assert.deepEqual(response.body.meta, { limit: 20, nextCursor: null });
  const own = response.body.data.find((e) => e.activity?.subject === "Solo del contacto");
  assert.deepEqual(Object.keys(own).sort(), ["activity", "at", "author", "deal", "id", "kind"]);
  assert.equal(own.deal, null);
  // Sin createdById, el autor es el responsable.
  assert.deepEqual(own.author, { id: seller.id, name: "Vendedor Línea" });
  assert.deepEqual(Object.keys(own.activity).sort(), ["assignee", "completedAt", "description", "dueAt", "id", "status", "subject", "type"]);
  const move = response.body.data.find((e) => e.kind === "STAGE");
  assert.deepEqual([move.deal, move.stage.from, move.stage.to.name, move.stage.reason], [{ id: deal.id, title: "Negocio Línea" }, null, "Inicial", null]);
  const won = response.body.data.find((e) => e.kind === "EVENT");
  assert.deepEqual(won.event, { action: "WON", changes: { closedAt: T.toISOString() } });
  assert.equal(response.body.data.length, 6);

  const bad = await asAdmin("/contacts/" + contact.id + "/timeline?cursor=nope");
  assert.deepEqual([bad.status, bad.body.error.message], [400, "El cursor no es válido."]);
  assert.equal((await asAdmin("/contacts/" + contact.id + "/timeline?limit=51")).status, 400);
  assert.equal((await asAdmin("/contacts/" + contact.id + "/timeline?page=2")).status, 400);
});
