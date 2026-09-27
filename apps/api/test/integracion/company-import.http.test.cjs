const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const { PASSWORD, cleanup, createUser, rucDePrueba } = require("../../../../test/datos-de-prueba.cjs");
const { startApi } = require("./api.cjs");

const HEADER = "Nombre;Razón social;RUC;Teléfono;Provincia";
const MAPPING = { name: "Nombre", legalName: "Razón social", taxId: "RUC", phone: "Teléfono", province: "Provincia" };

let api;
let token;
const first = rucDePrueba();
const second = rucDePrueba();

/** Sube un CSV como lo hace la web: multipart con `file` y `mapping`. */
function upload(content, { mapping = MAPPING, auth = true } = {}) {
  const form = new FormData();
  form.set("file", new Blob([content], { type: "text/csv" }), "empresas.csv");
  form.set("mapping", JSON.stringify(mapping));
  return api.call("/companies/import", { method: "POST", body: form, token: auth ? token : undefined });
}

before(async () => {
  api = await startApi();
  const seller = await createUser(api.prisma, { name: "Vendedora Empresas" });
  token = (await api.call("/auth/login", { method: "POST", body: { email: seller.email, password: PASSWORD } })).body
    .accessToken;
});
after(async () => {
  await cleanup(api.prisma);
  await api.close();
});

test("CRM-15/16: un CSV de Excel (Windows-1252 y punto y coma) crea empresas normalizadas", async () => {
  const content = Buffer.from(
    [HEADER, `Café Andino;Café Andino S.A.;${first};+57 601 234 5678;pichincha`, `Textiles Sur;;${second};;Azuay`].join(
      "\r\n",
    ),
    "latin1",
  );
  const response = await upload(content);
  assert.equal(response.status, 201, JSON.stringify(response.body));
  assert.deepEqual(response.body, { imported: 2 });

  const saved = await api.prisma.company.findUnique({ where: { taxId: first } });
  assert.equal(saved.name, "Café Andino");
  assert.equal(saved.legalName, "Café Andino S.A.");
  assert.equal(saved.phone, "+576012345678");
  assert.equal(saved.province, "Pichincha");
});

test("CRM-15/16: reimportar no duplica; mapeo sin RUC, archivo grande o sin sesión se rechazan", async () => {
  const again = await upload([HEADER, `Café Andino;;${first};;`].join("\n"));
  assert.equal(again.status, 422);
  assert.equal(again.body.error.message, "No se importó ninguna empresa: 1 fila tiene errores.");
  assert.deepEqual(again.body.error.errors, [{ row: 2, column: "RUC", message: "Ya existe una empresa con ese RUC." }]);

  const withoutRuc = await upload([HEADER, "Uno;;;;"].join("\n"), { mapping: { name: "Nombre" } });
  assert.equal(withoutRuc.status, 400);
  assert.equal(withoutRuc.body.error.message, "Asigna la columna del RUC.");
  assert.equal((await upload("x".repeat(1024 * 1024 + 1))).status, 413);
  assert.equal((await upload([HEADER, "Uno;;;;"].join("\n"), { auth: false })).status, 401);
});
