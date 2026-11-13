// CRM-26: notas y menciones contra la rama "pruebas".
const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const { PASSWORD, cedulaDePrueba, cleanup, createUser } = require("../../../../test/datos-de-prueba.cjs");
const { startApi } = require("./api.cjs");

let api, admin, seller, other, inactive, tokens, pipeline, contact, deal, foreignDeal;
const login = async (user) =>
  (await api.call("/auth/login", { method: "POST", body: { email: user.email, password: PASSWORD } })).body.accessToken;
const as = (who, path, options = {}) => api.call(path, { ...options, token: tokens[who] });
const mentionsOf = (noteId) => api.inbox.filter((mail) => mail.kind === "mention" && mail.path.includes(noteId));

before(async () => {
  api = await startApi();
  admin = await createUser(api.prisma, { name: "Admin Notas", role: "ADMIN" });
  seller = await createUser(api.prisma, { name: "Vendedora Notas" });
  other = await createUser(api.prisma, { name: "Otro Notas" });
  inactive = await createUser(api.prisma, { name: "Baja Notas", active: false });
  tokens = { admin: await login(admin), seller: await login(seller), other: await login(other) };
  pipeline = await api.prisma.pipeline.create({
    data: { name: "Pipeline Notas", stages: { create: { name: "Inicial", position: 0, probability: 10 } } },
    include: { stages: true },
  });
  contact = await api.prisma.contact.create({
    data: { firstName: "Noa", lastName: "Notas", documentType: "CEDULA", documentId: cedulaDePrueba(), email: "noa.notas@example.com", ownerId: seller.id },
  });
  const base = { value: 0, pipelineId: pipeline.id, stageId: pipeline.stages[0].id };
  deal = await api.prisma.deal.create({ data: { ...base, title: "Negocio Notas", contactId: contact.id, ownerId: seller.id } });
  foreignDeal = await api.prisma.deal.create({ data: { ...base, title: "Ajeno Notas", ownerId: other.id } });
});

after(async () => {
  if (!api) return;
  const deals = [deal?.id, foreignDeal?.id].filter(Boolean);
  await api.prisma.note.deleteMany({ where: { OR: [{ dealId: { in: deals } }, { contactId: contact?.id }] } });
  await api.prisma.auditLog.deleteMany({ where: { entityType: "Note", userId: { in: [admin, seller, other].map((u) => u.id) } } });
  await api.prisma.deal.deleteMany({ where: { id: { in: deals } } });
  if (pipeline) await api.prisma.pipeline.deleteMany({ where: { id: pipeline.id } });
  await cleanup(api.prisma);
  await api.close();
});

test("la responsable anota con menciones: autor, fecha, texto sin interpretar y un aviso por miembro", async () => {
  assert.equal((await api.call(`/deals/${deal.id}/notes`, { method: "POST", body: { content: "x" } })).status, 401);
  const created = await as("seller", `/deals/${deal.id}/notes`, {
    method: "POST",
    body: { content: "<img src=x onerror=alert(1)> Llamar", mentionIds: [other.id, other.id, seller.id, admin.id] },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  const note = created.body;
  assert.equal(note.content, "<img src=x onerror=alert(1)> Llamar");
  assert.equal(note.author.id, seller.id);
  assert.ok(new Date(note.createdAt).getTime() > 0);
  assert.deepEqual(note.mentions.map((m) => m.id).sort(), [admin.id, other.id].sort());
  const sent = api.inbox.filter((mail) => mail.kind === "mention" && mail.path === `/pipeline/${deal.id}`);
  assert.deepEqual(sent.map((mail) => mail.email).sort(), [admin.email, other.email].sort());
  assert.ok(sent.every((mail) => mail.record === "negocio «Negocio Notas»" && mail.author === "Vendedora Notas"));

  // Editar con las mismas menciones no vuelve a avisar.
  const edited = await as("seller", `/notes/${note.id}`, { method: "PATCH", body: { content: "Llamar el lunes", mentionIds: [other.id, admin.id] } });
  assert.equal(edited.status, 200, JSON.stringify(edited.body));
  assert.ok(edited.body.editedAt);
  assert.equal(api.inbox.filter((mail) => mail.kind === "mention" && mail.path === `/pipeline/${deal.id}`).length, 2);

  // La nota aparece en el historial con sus menciones; "other" no es responsable: la mención no le da acceso.
  const timeline = await as("seller", `/deals/${deal.id}/timeline`);
  const event = timeline.body.data.find((e) => e.id === `NOTE:${note.id}`);
  assert.equal(event.note.content, "Llamar el lunes");
  assert.equal(event.note.canEdit, true);
  assert.equal((await as("other", `/deals/${deal.id}/timeline`)).status, 404);
  assert.equal((await as("other", `/notes/${note.id}`, { method: "PATCH", body: { content: "y" } })).status, 404);

  const audit = await api.prisma.auditLog.findMany({ where: { entityType: "Note", entityId: note.id } });
  assert.deepEqual(audit.map((a) => [a.action, a.userId, a.changes.content]), [["UPDATED", seller.id, "<img src=x onerror=alert(1)> Llamar"]]);
});

test("menciones solo a miembros activos y texto obligatorio: 400 sin guardar", async () => {
  const before = await api.prisma.note.count({ where: { contactId: contact.id } });
  const inactiveMention = await as("seller", `/contacts/${contact.id}/notes`, {
    method: "POST",
    body: { content: "Hola", mentionIds: [inactive.id] },
  });
  assert.deepEqual([inactiveMention.status, inactiveMention.body.error.message], [400, "Solo puedes mencionar a miembros activos del equipo."]);
  const empty = await as("seller", `/contacts/${contact.id}/notes`, { method: "POST", body: { content: "   " } });
  assert.equal(empty.status, 400);
  assert.equal(await api.prisma.note.count({ where: { contactId: contact.id } }), before);
});

test("sin alcance sobre el registro: 404 al anotar, editar o borrar, sin exponer el contenido", async () => {
  const hidden = await as("seller", `/deals/${foreignDeal.id}/notes`, { method: "POST", body: { content: "x" } });
  assert.deepEqual([hidden.status, hidden.body.error.message], [404, "Negocio no encontrado."]);
  const own = await as("other", `/deals/${foreignDeal.id}/notes`, { method: "POST", body: { content: "Secreta" } });
  assert.equal(own.status, 201);
  for (const method of ["PATCH", "DELETE"]) {
    const response = await as("seller", `/notes/${own.body.id}`, { method, body: method === "PATCH" ? { content: "y" } : undefined });
    assert.equal(response.status, 404);
    assert.doesNotMatch(JSON.stringify(response.body), /Secreta/);
  }
});

test("editar o borrar: la responsable no puede con una nota ajena (403); ADMIN sí y queda traza", async () => {
  const byAdmin = await as("admin", `/contacts/${contact.id}/notes`, { method: "POST", body: { content: "Del admin" } });
  assert.equal(byAdmin.status, 201);
  const forbidden = await as("seller", `/notes/${byAdmin.body.id}`, { method: "DELETE" });
  assert.equal(forbidden.status, 403);
  const timeline = await as("seller", `/contacts/${contact.id}/timeline`);
  assert.equal(timeline.body.data.find((e) => e.id === `NOTE:${byAdmin.body.id}`).note.canEdit, false);

  const bySeller = await as("seller", `/contacts/${contact.id}/notes`, { method: "POST", body: { content: "Mía" } });
  assert.equal((await as("admin", `/notes/${bySeller.body.id}`, { method: "DELETE" })).status, 204);
  assert.equal(await api.prisma.note.count({ where: { id: bySeller.body.id } }), 0);
  const [trace] = await api.prisma.auditLog.findMany({ where: { entityType: "Note", entityId: bySeller.body.id } });
  assert.deepEqual([trace.action, trace.userId, trace.changes.content, trace.changes.authorId], ["DELETED", admin.id, "Mía", seller.id]);
  assert.equal(mentionsOf(bySeller.body.id).length, 0);
});
