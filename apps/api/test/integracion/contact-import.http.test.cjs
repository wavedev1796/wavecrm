const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const { PASSWORD, cedulaDePrueba, cleanup, createUser, rucDePrueba } = require("../../../../test/datos-de-prueba.cjs");
const { startApi } = require("./api.cjs");

const HEADER = "Nombre;Apellido;Cédula;Teléfono;Provincia;Etiquetas;RUC empresa";
const MAPPING = {
  firstName: "Nombre",
  lastName: "Apellido",
  documentId: "Cédula",
  phone: "Teléfono",
  province: "Provincia",
  tags: "Etiquetas",
  companyTaxId: "RUC empresa",
};

let api;
let seller;
let token;
let company;
const first = cedulaDePrueba();
const second = cedulaDePrueba();

/** Sube un CSV como lo hace la web: multipart con `file` y `mapping`. */
function upload(content, { mapping = MAPPING, name = "contactos.csv", field = "file", auth = true } = {}) {
  const form = new FormData();
  form.set(field, new Blob([content], { type: "text/csv" }), name);
  form.set("mapping", JSON.stringify(mapping));
  return api.call("/contacts/import", { method: "POST", body: form, token: auth ? token : undefined });
}

before(async () => {
  api = await startApi();
  seller = await createUser(api.prisma, { name: "Vendedora Importa" });
  token = (await api.call("/auth/login", { method: "POST", body: { email: seller.email, password: PASSWORD } })).body
    .accessToken;
  company = await api.prisma.company.create({ data: { name: "Empresa Prueba", taxId: rucDePrueba(), ownerId: seller.id } });
});
after(async () => {
  await cleanup(api.prisma);
  await api.close();
});

test("CRM-16: un CSV de Excel (Windows-1252 y punto y coma) crea contactos normalizados y enlazados a su empresa", async () => {
  const content = Buffer.from(
    [HEADER, `María;Cordero;${first};099 123 4567;pichincha;Cliente, VIP;${company.taxId}`, `Luis;Mora;${second};;Guayas;;`].join(
      "\r\n",
    ),
    "latin1",
  );
  const response = await upload(content);
  assert.equal(response.status, 201);
  assert.deepEqual(response.body, { imported: 2 });

  const saved = await api.prisma.contact.findUnique({ where: { documentId: first } });
  assert.equal(saved.firstName, "María");
  assert.equal(saved.phone, "+593991234567");
  assert.equal(saved.province, "Pichincha");
  assert.deepEqual(saved.tags, ["cliente", "vip"]);
  assert.equal(saved.companyId, company.id);
  assert.equal(saved.ownerId, seller.id);
});

test("CRM-12/CRM-16: reimportar el mismo archivo no duplica porque las cédulas ya existen", async () => {
  const response = await upload([HEADER, `María;Cordero;${first};;;;`, `Luis;Mora;${second};;;;`].join("\n"));
  assert.equal(response.status, 422);
  assert.equal(response.body.error.message, "No se importó ningún contacto: 2 filas tienen errores.");
  assert.deepEqual(response.body.error.errors, [
    { row: 2, column: "Cédula", message: "Ya existe un contacto con esa cédula." },
    { row: 3, column: "Cédula", message: "Ya existe un contacto con esa cédula." },
  ]);
});

test("CRM-16: con una fila inválida no se guarda ninguna y el reporte indica fila, columna y motivo", async () => {
  const valid = cedulaDePrueba();
  const response = await upload(
    [HEADER, `Ana;López;${valid};;;;`, "Eva;Ruiz;1712345678;02 1;Quito;;", `Rosa;Vera;;;;;${rucDePrueba()}`].join("\n"),
  );
  assert.equal(response.status, 422);
  assert.deepEqual(response.body.error.errors, [
    { row: 3, column: "Cédula", message: "La cédula no es válida." },
    { row: 3, column: "Teléfono", message: "Escribe un teléfono de Ecuador, por ejemplo 0991234567 o 022345678." },
    { row: 3, column: "Provincia", message: "Elige una provincia de Ecuador." },
    { row: 4, column: "RUC empresa", message: "No existe una empresa con ese RUC." },
  ]);
  assert.equal(await api.prisma.contact.count({ where: { documentId: valid } }), 0);
});

test("CRM-16: archivo, mapeo o sesión inválidos responden con un mensaje claro", async () => {
  const csv = [HEADER, "Ana;López;;;;;"].join("\n");
  const withoutFile = new FormData();
  withoutFile.set("mapping", JSON.stringify(MAPPING));
  const cases = [
    [await api.call("/contacts/import", { method: "POST", token, body: withoutFile }), 400, "Adjunta un archivo CSV."],
    [await upload(csv, { name: "contactos.txt" }), 400, "El archivo debe ser .csv."],
    [await upload(csv, { mapping: { firstName: "Nombre" } }), 400, "Asigna la columna del apellido."],
    [await upload(csv, { field: "archivo" }), 400, "La solicitud no tiene un formato válido."],
    [await upload("x".repeat(1024 * 1024 + 1)), 413, "La solicitud es demasiado grande."],
  ];
  for (const [response, status, message] of cases) {
    assert.equal(response.status, status, message);
    assert.equal(response.body.error.message, message);
  }
  assert.equal((await upload(csv, { auth: false })).status, 401);
});
