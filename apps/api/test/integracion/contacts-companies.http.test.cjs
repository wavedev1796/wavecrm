const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  PASSWORD,
  cedulaDePrueba,
  cleanup,
  createUser,
  rucDePrueba,
} = require("../../../../test/datos-de-prueba.cjs");
const { startApi } = require("./api.cjs");

let api;
let user;
let token;
let contactId;
let companyId;
const documentId = cedulaDePrueba();
const taxId = rucDePrueba();

const messageOf = (response) => response.body.error.message;
const call = (path, options = {}) => api.call(path, { ...options, token });

before(async () => {
  api = await startApi();
  user = await createUser(api.prisma, { name: "Responsable CRM Trece" });
  const login = await api.call("/auth/login", {
    method: "POST",
    body: { email: user.email, password: PASSWORD },
  });
  token = login.body.accessToken;
});

after(async () => {
  await cleanup(api.prisma);
  await api.close();
});

test("CRM-13: contactos y empresas requieren autenticación", async () => {
  assert.equal((await api.call("/contacts")).status, 401);
  assert.equal((await api.call("/companies")).status, 401);
});

test("CRM-13: crea una empresa normalizada y rechaza el RUC repetido", async () => {
  const response = await call("/companies", {
    method: "POST",
    body: {
      name: "  Wave   Comercial  ",
      legalName: " Wave Comercial S.A. ",
      taxId: taxId.replace(/(\d{3})(?=\d)/g, "$1 "),
      email: " VENTAS@WAVE.EC ",
      phone: "02 234 5678",
      province: "pichincha",
      city: "  quito ",
      tags: [" Cliente ", "VIP", "cliente"],
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  companyId = response.body.id;
  assert.equal(response.body.name, "Wave Comercial");
  assert.equal(response.body.taxId, taxId);
  assert.equal(response.body.email, "ventas@wave.ec");
  assert.equal(response.body.phone, "+59322345678");
  assert.equal(response.body.province, "Pichincha");
  assert.deepEqual(response.body.tags, ["cliente", "vip"]);
  assert.equal(response.body.owner.id, user.id);

  const duplicate = await call("/companies", {
    method: "POST",
    body: { name: "Otra Empresa", taxId },
  });
  assert.equal(duplicate.status, 409);
  assert.equal(messageOf(duplicate), "Ya existe una empresa con ese RUC.");
});

test("CRM-13: crea un contacto relacionado y rechaza la cédula repetida", async () => {
  const response = await call("/contacts", {
    method: "POST",
    body: {
      firstName: "  Ana  ",
      lastName: "  López  ",
      documentId,
      email: " ANA@WAVE.EC ",
      phone: "099 123 4567",
      province: "pichincha",
      city: " Quito ",
      position: " Gerente   comercial ",
      tags: "Cliente;VIP;cliente",
      companyId,
    },
  });
  assert.equal(response.status, 201, JSON.stringify(response.body));
  contactId = response.body.id;
  assert.equal(response.body.documentId, documentId);
  assert.equal(response.body.phone, "+593991234567");
  assert.deepEqual(response.body.tags, ["cliente", "vip"]);
  assert.equal(response.body.company.id, companyId);
  assert.equal(response.body.owner.id, user.id);

  const duplicate = await call("/contacts", {
    method: "POST",
    body: { firstName: "Otra", lastName: "Persona", documentId },
  });
  assert.equal(duplicate.status, 409);
  assert.equal(messageOf(duplicate), "Ya existe un contacto con esa cédula.");
});

test("CRM-13: busca, filtra y pagina contactos y empresas", async () => {
  for (const path of [
    "/contacts?search=ANA%20L%C3%93PEZ&province=pichincha&tag=VIP&page=1&limit=1",
    `/contacts?search=${taxId}&limit=1`,
    "/companies?search=wave&province=Pichincha&tag=cliente&page=1&limit=1",
    `/companies?search=${taxId}&limit=1`,
  ]) {
    const response = await call(path);
    assert.equal(response.status, 200, path);
    assert.equal(response.body.data.length, 1, path);
    assert.deepEqual(
      response.body.meta,
      { page: 1, limit: 1, total: 1, totalPages: 1 },
      path,
    );
  }
});

test("CRM-13: obtiene y actualiza fichas; vacío borra un campo opcional", async () => {
  const contact = await call(`/contacts/${contactId}`);
  assert.equal(contact.status, 200);
  assert.equal(contact.body.company.name, "Wave Comercial");
  assert.deepEqual(contact.body.deals, []);
  assert.deepEqual(contact.body.activities, []);

  const updatedContact = await call(`/contacts/${contactId}`, {
    method: "PATCH",
    body: { email: "", city: "Guayaquil", tags: [] },
  });
  assert.equal(updatedContact.status, 200);
  assert.equal(updatedContact.body.email, null);
  assert.equal(updatedContact.body.city, "Guayaquil");
  assert.deepEqual(updatedContact.body.tags, []);

  const updatedCompany = await call(`/companies/${companyId}`, {
    method: "PATCH",
    body: { address: " Av. República 123 ", tags: ["prospecto"] },
  });
  assert.equal(updatedCompany.status, 200);
  assert.equal(updatedCompany.body.address, "Av. República 123");
  assert.deepEqual(updatedCompany.body.tags, ["prospecto"]);
});

test("CRM-13: valida datos y devuelve 404 para fichas inexistentes", async () => {
  const invalid = await call("/contacts", {
    method: "POST",
    body: { firstName: "A1", lastName: "X", province: "Atlantis" },
  });
  assert.equal(invalid.status, 400);
  assert.deepEqual(messageOf(invalid), [
    "El nombre solo puede tener letras, espacios, apóstrofos, guiones y puntos.",
    "El apellido debe tener entre 2 y 100 caracteres.",
    "Elige una provincia de Ecuador.",
  ]);
  assert.equal((await call("/contacts/no-existe")).status, 404);
  assert.equal((await call("/companies/no-existe")).status, 404);
});

test("CRM-13: elimina el contacto y la empresa", async () => {
  assert.equal(
    (await call(`/contacts/${contactId}`, { method: "DELETE" })).status,
    204,
  );
  assert.equal(
    (await call(`/companies/${companyId}`, { method: "DELETE" })).status,
    204,
  );
  assert.equal((await call(`/contacts/${contactId}`)).status, 404);
  assert.equal((await call(`/companies/${companyId}`)).status, 404);
});
