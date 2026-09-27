const { test } = require("node:test");
const assert = require("node:assert/strict");
const casos = require("../../../test/casos-de-validacion.json");
const { PHONE_INVALID, normalizePhone } = require("../dist/common/phone.js");

test("cumple los casos compartidos de teléfono", () => {
  for (const { valor, pais, error } of casos.telefono) {
    const valid = !valor.trim() || normalizePhone(valor, pais) !== null;
    assert.equal(valid ? null : PHONE_INVALID, error, `${pais ?? "EC"} ${valor}`);
  }
});

test("guarda en E.164; sin + el número es de Ecuador", () => {
  assert.equal(normalizePhone("0991234567"), "+593991234567");
  assert.equal(normalizePhone("593991234567"), "+593991234567");
  assert.equal(normalizePhone("(02) 234-5678"), "+59322345678");
  assert.equal(normalizePhone("+57 601 234 5678"), "+576012345678");
  assert.equal(normalizePhone("601 234 5678", "CO"), "+576012345678");
  assert.equal(normalizePhone("+593991234567"), "+593991234567");
});
