const { test } = require("node:test");
const assert = require("node:assert/strict");
const { HealthController } = require("../dist/modules/health/health.controller.js");

test("healthcheck informa que la API está disponible", () => {
  const before = Date.now();
  const response = new HealthController().check();
  const after = Date.now();

  assert.equal(response.status, "ok");
  assert.equal(response.service, "wavecrm-api");
  assert.ok(Date.parse(response.timestamp) >= before);
  assert.ok(Date.parse(response.timestamp) <= after);
});
