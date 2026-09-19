const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const { startApi } = require("./api.cjs");

let api;
before(async () => {
  api = await startApi();
});
after(() => api.close());

test("CRM-10: el API responde con helmet, sin X-Powered-By y con CORS solo para la web", async () => {
  const allowed = await api.call("/health", { headers: { Origin: "http://localhost:3000" } });
  assert.equal(allowed.status, 200);
  assert.equal(allowed.body.status, "ok");
  assert.equal(allowed.headers.get("x-content-type-options"), "nosniff");
  assert.ok(allowed.headers.get("content-security-policy"));
  assert.equal(allowed.headers.get("x-powered-by"), null);
  assert.equal(allowed.headers.get("access-control-allow-origin"), "http://localhost:3000");
  assert.equal(allowed.headers.get("access-control-allow-credentials"), null);

  const foreign = await api.call("/health", { headers: { Origin: "https://otro-sitio.example" } });
  assert.equal(foreign.headers.get("access-control-allow-origin"), null);
});

test("la base de pruebas responde (Neon, rama pruebas)", async () => {
  assert.equal(typeof (await api.prisma.user.count()), "number");
});
