const { before, after, test } = require("node:test");
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { startApi } = require("./api.cjs");
const { cedulaDePrueba, createUser, PASSWORD, rucDePrueba } = require("../../../../test/datos-de-prueba.cjs");

let api, vendor, admin, vendorToken, adminToken, pipeline, stage, company, contact, deal, product;
const today = new Date(Date.now() - 5 * 3600e3).toISOString().slice(0, 10) + "T00:00:00.000Z";
const validUntil = new Date(Date.now() + 30 * 864e5).toISOString().slice(0, 10) + "T00:00:00.000Z";
const call = (path, options = {}) => api.call(path, { ...options, token: vendorToken });
const asAdmin = (path, options = {}) => api.call(path, { ...options, token: adminToken });

before(async () => {
  api = await startApi();
  vendor = await createUser(api.prisma, { name: "Vendedor Catálogo" });
  admin = await createUser(api.prisma, { role: "ADMIN", name: "Admin Catálogo" });
  vendorToken = (await api.call("/auth/login", { method: "POST", body: { email: vendor.email, password: PASSWORD } })).body.accessToken;
  adminToken = (await api.call("/auth/login", { method: "POST", body: { email: admin.email, password: PASSWORD } })).body.accessToken;
  pipeline = await api.prisma.pipeline.create({ data: { name: "Pipeline Catálogo" } });
  stage = await api.prisma.stage.create({ data: { name: "Inicial", position: 0, probability: 10, pipelineId: pipeline.id } });
  company = await api.prisma.company.create({ data: { name: "Empresa Catálogo", taxId: rucDePrueba(), ownerId: vendor.id } });
  contact = await api.prisma.contact.create({ data: { firstName: "Ana", lastName: "Catálogo", documentType: "CEDULA", documentId: cedulaDePrueba(), email: "catalogo@example.com", ownerId: vendor.id, companyId: company.id } });
  deal = await api.prisma.deal.create({ data: { title: "Negocio Catálogo", value: 0, pipelineId: pipeline.id, stageId: stage.id, ownerId: vendor.id, companyId: company.id, contactId: contact.id } });
});

after(async () => {
  if (!api) return;
  if (deal) await api.prisma.auditLog.deleteMany({ where: { entityType: "Deal", entityId: deal.id } });
  if (product) await api.prisma.auditLog.deleteMany({ where: { entityType: "Product", entityId: product.id } });
  if (deal) await api.prisma.deal.deleteMany({ where: { id: deal.id } });
  if (product) await api.prisma.product.deleteMany({ where: { id: product.id } });
  if (pipeline) await api.prisma.pipeline.deleteMany({ where: { id: pipeline.id } });
  if (contact) await api.prisma.contact.deleteMany({ where: { id: contact.id } });
  if (company) await api.prisma.company.deleteMany({ where: { id: company.id } });
  if (vendor || admin) await api.prisma.user.deleteMany({ where: { id: { in: [vendor?.id, admin?.id].filter(Boolean) } } });
  await api.close();
});

test("CRM-27: ADMIN administra el catálogo; VENDEDOR consulta activos y reutiliza snapshots sin alterar el negocio", async () => {
  assert.equal((await api.call("/products")).status, 401);
  assert.equal((await call("/products", { method: "POST", body: { code: "SERV-001", description: "Consultoría", price: 100, taxRate: 12 } })).status, 403);
  assert.equal((await asAdmin("/products", { method: "POST", body: { code: "MAL CODIGO", description: "Consultoría", price: 100, taxRate: 12 } })).status, 400);
  const created = await asAdmin("/products", { method: "POST", body: { code: "serv-001", description: "Consultoría", price: 100, taxRate: 12 } });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  product = created.body;
  assert.deepEqual([product.code, product.description, product.price, product.taxRate, product.isActive], ["SERV-001", "Consultoría", "100", 12, true]);
  assert.equal((await asAdmin("/products", { method: "POST", body: { code: "SERV-001", description: "Duplicado", price: 10, taxRate: 0 } })).status, 409);
  assert.equal((await call("/products/" + product.id + "?includeInactive=true")).status, 200);
  assert.equal((await call("/products/" + product.id, { method: "PATCH", body: { price: 200 } })).status, 403);
  const visible = await call("/products?search=serv-001");
  assert.equal(visible.status, 200);
  assert.equal(visible.body.data[0].id, product.id);
  assert.equal("inventory" in visible.body.data[0], false);

  const saved = await call("/deals/" + deal.id + "/items", { method: "PUT", body: { items: [{ productId: product.id, quantity: 2, discountRate: 10 }] } });
  assert.equal(saved.status, 200, JSON.stringify(saved.body));
  assert.deepEqual([saved.body.items[0].description, saved.body.items[0].unitPrice, saved.body.items[0].taxRate, saved.body.items[0].discountRate], ["Consultoría", "100", 12, 10]);
  assert.equal(saved.body.value, "180");

  const proposal = await call("/deals/" + deal.id + "/quotes", { method: "POST", body: { requestKey: randomUUID(), validUntil } });
  assert.equal(proposal.status, 201, JSON.stringify(proposal.body));
  const quote = proposal.body.quotes.find((entry) => entry.status === "SENT");
  assert.deepEqual([quote.items[0].product.code, quote.items[0].product.description, quote.items[0].unitPrice, quote.items[0].discountRate], ["SERV-001", "Consultoría", "100", 10]);
  assert.equal(quote.total, "201.6");

  const changed = await asAdmin("/products/" + product.id, { method: "PATCH", body: { description: "Consultoría avanzada", price: 150, taxRate: 0 } });
  assert.equal(changed.status, 200, JSON.stringify(changed.body));
  const refreshedDeal = await call("/deals/" + deal.id);
  assert.deepEqual([refreshedDeal.body.items[0].description, refreshedDeal.body.items[0].unitPrice, refreshedDeal.body.items[0].taxRate], ["Consultoría", "100", 12]);
  const savedQuote = await call("/quotes/" + quote.id);
  assert.deepEqual([savedQuote.body.items[0].product.code, savedQuote.body.items[0].product.description, savedQuote.body.items[0].unitPrice, savedQuote.body.total], ["SERV-001", "Consultoría", "100", "201.6"]);

  const inactive = await asAdmin("/products/" + product.id, { method: "PATCH", body: { isActive: false } });
  assert.equal(inactive.status, 200);
  assert.equal((await call("/products/" + product.id)).status, 404);
  assert.equal((await call("/products?includeInactive=true")).body.data.some((entry) => entry.id === product.id), false);
  assert.equal((await asAdmin("/products?includeInactive=true")).body.data.some((entry) => entry.id === product.id), true);
  const selectedAgain = await call("/deals/" + deal.id + "/items", { method: "PUT", body: { items: [{ productId: product.id, quantity: 1 }] } });
  assert.equal(selectedAgain.status, 409);
  assert.equal(await api.prisma.dealItem.count({ where: { dealId: deal.id } }), 1);
  assert.equal(await api.prisma.auditLog.count({ where: { entityType: "Product", entityId: product.id } }), 3);
});
