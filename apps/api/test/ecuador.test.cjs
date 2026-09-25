const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  PROVINCES,
  isCedula,
  isRuc,
  normalizeDigits,
  normalizePhone,
  officialProvince,
} = require("../dist/common/ecuador.js");

test("cédula: provincia 01–24 o 30, tercer dígito menor que 6 y módulo 10", () => {
  for (const valid of ["1712345675", "0102030400", "3012345678", "0912345675", "1103040505"]) {
    assert.equal(isCedula(valid), true, valid);
  }
  for (const invalid of ["1712345678", "2512345675", "0012345674", "1762345674", "171234567", "17123456755", "17123456a5"]) {
    assert.equal(isCedula(invalid), false, invalid);
  }
});

test("RUC: persona natural, sociedad privada y entidad pública", () => {
  for (const valid of ["1712345675001", "0912345675001", "1791234561001", "1791000080001", "1760000070001", "0960012310001"]) {
    assert.equal(isRuc(valid), true, valid);
  }
  for (const invalid of [
    "1712345675000", // natural con establecimiento 000
    "1712345678001", // natural con cédula inválida
    "1791234562001", // privada con verificador incorrecto
    "1791234561000", // privada con establecimiento 000
    "1791000030001", // privada cuyo módulo 11 da 10
    "1760000080001", // pública con verificador incorrecto
    "1760000070000", // pública con establecimiento 0000
    "1771234567001", // tercer dígito 7
    "2591234563001", // provincia 25
    "179123456100", // 12 dígitos
  ]) {
    assert.equal(isRuc(invalid), false, invalid);
  }
});

test("teléfono: móviles y fijos de Ecuador en E.164", () => {
  assert.equal(normalizePhone("0991234567"), "+593991234567");
  assert.equal(normalizePhone("+593 99 123 4567"), "+593991234567");
  assert.equal(normalizePhone("593991234567"), "+593991234567");
  assert.equal(normalizePhone("(02) 234-5678"), "+59322345678");
  assert.equal(normalizePhone("+593991234567"), "+593991234567");
  assert.equal(normalizePhone("099123456"), null);
  assert.equal(normalizePhone("0123456789"), null);
  assert.equal(normalizePhone("+1 555 123 4567"), null);
});

test("provincias: 24 nombres oficiales sin importar tildes ni mayúsculas", () => {
  assert.equal(PROVINCES.length, 24);
  assert.equal(officialProvince(" pichincha "), "Pichincha");
  assert.equal(officialProvince("MANABI"), "Manabí");
  assert.equal(officialProvince("santo domingo de los tsachilas"), "Santo Domingo de los Tsáchilas");
  assert.equal(officialProvince("Quito"), null);
  assert.equal(normalizeDigits(" 171234567-5 "), "1712345675");
});
