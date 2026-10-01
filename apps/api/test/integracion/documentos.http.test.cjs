const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const {
  PASSWORD,
  cedulaDePrueba,
  cleanup,
  createUser,
  pasaporteDePrueba,
} = require("../../../../test/datos-de-prueba.cjs");
const { startApi } = require("./api.cjs");

let api;
let user;
let token;
const call = (path, options = {}) => api.call(path, { ...options, token });
const messageOf = (response) => response.body.error.message;

before(async () => {
  api = await startApi();
  user = await createUser(api.prisma, { name: "Responsable Documentos" });
  token = (
    await api.call("/auth/login", {
      method: "POST",
      body: { email: user.email, password: PASSWORD },
    })
  ).body.accessToken;
});
after(async () => {
  await cleanup(api.prisma);
  await api.close();
});

test("contacto con pasaporte, teléfono extranjero, búsqueda sin mayúsculas y documento repetido", async () => {
  const passport = pasaporteDePrueba();
  const created = await call("/contacts", {
    method: "POST",
    body: {
      firstName: "John",
      lastName: "Smith",
      documentType: "PASAPORTE",
      documentId: passport.toLowerCase(),
      phone: "+57 601 234 5678",
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.documentType, "PASAPORTE");
  assert.equal(created.body.documentId, passport);
  assert.equal(created.body.phone, "+576012345678");

  const found = await call(`/contacts?search=${passport.toLowerCase()}`);
  assert.equal(found.body.data.length, 1);

  const duplicate = await call("/contacts", {
    method: "POST",
    body: {
      firstName: "Otra",
      lastName: "Persona",
      documentType: "PASAPORTE",
      documentId: passport,
    },
  });
  assert.equal(duplicate.status, 409);
  assert.equal(
    messageOf(duplicate),
    "Ya existe un contacto con ese documento.",
  );
});

test("RUC de persona natural sí, de sociedad no; el documento es obligatorio y no se puede vaciar", async () => {
  const natural = await call("/contacts", {
    method: "POST",
    body: {
      firstName: "Ana",
      lastName: "Mora",
      documentType: "RUC",
      documentId: `${cedulaDePrueba()}001`,
    },
  });
  assert.equal(natural.status, 201, JSON.stringify(natural.body));

  for (const [body, message, ...more] of [
    [
      { documentType: "RUC", documentId: "1791234561001" },
      "El RUC de una persona natural es su cédula seguida de 001.",
    ],
    [{ documentId: cedulaDePrueba() }, "Elige el tipo de documento."],
    [{ documentType: "CEDULA" }, "Ingresa el número de documento."],
    [{}, "Elige el tipo de documento.", "Ingresa el número de documento."],
  ]) {
    const response = await call("/contacts", {
      method: "POST",
      body: { firstName: "Eva", lastName: "Ruiz", ...body },
    });
    assert.equal(response.status, 400, message);
    assert.deepEqual(messageOf(response), [message, ...more]);
  }

  const onlyType = await call(`/contacts/${natural.body.id}`, {
    method: "PATCH",
    body: { documentType: "CEDULA" },
  });
  assert.equal(onlyType.status, 400);
  assert.equal(messageOf(onlyType), "Ingresa el número de documento.");

  const cleared = await call(`/contacts/${natural.body.id}`, {
    method: "PATCH",
    body: { documentType: null, documentId: "" },
  });
  assert.equal(cleared.status, 400);
  assert.deepEqual(messageOf(cleared), [
    "Elige el tipo de documento.",
    "Ingresa el número de documento.",
  ]);
});

test("la base exige tipo y número de documento (NOT NULL)", async () => {
  // SQL directo: el cliente de Prisma ya no deja omitirlos, así que se prueba la columna.
  await assert.rejects(
    api.prisma.$executeRaw`INSERT INTO "Contact" ("id", "firstName", "lastName", "documentId", "ownerId", "updatedAt")
      VALUES (${`sin-tipo-${Date.now()}`}, 'Sin', 'Tipo', ${cedulaDePrueba()}, ${user.id}, now())`,
    /23502/, // not_null_violation de Postgres
  );
});
