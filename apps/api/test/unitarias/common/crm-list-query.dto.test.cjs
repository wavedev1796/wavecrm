const { test } = require("node:test");
const assert = require("node:assert/strict");
const { plainToInstance } = require("class-transformer");
const { validate } = require("class-validator");
const { CrmListQueryDto } = require("../../../dist/common/dto/crm-list-query.dto.js");

async function errors(body) {
  const result = await validate(plainToInstance(CrmListQueryDto, body), { stopAtFirstError: true });
  return Object.fromEntries(result.map((error) => [error.property, Object.values(error.constraints)[0]]));
}

test("los filtros de listados recortan texto y pasan la etiqueta a minúsculas", async () => {
  const query = { page: "1", limit: "10", search: "  ana ", tag: " Cliente ", ownerId: " user-1 ", province: "Pichincha" };
  assert.deepEqual(await errors(query), {});
  const dto = plainToInstance(CrmListQueryDto, query);
  assert.equal(dto.search, "ana");
  assert.equal(dto.tag, "cliente");
  assert.equal(dto.ownerId, "user-1");
});

test("los filtros de listados explican cada error en español", async () => {
  assert.deepEqual(await errors({ search: "x".repeat(101), tag: "x".repeat(31), ownerId: ["a"] }), {
    search: "La búsqueda no puede superar 100 caracteres.",
    tag: "La etiqueta no puede superar 30 caracteres.",
    ownerId: "El responsable debe ser un identificador válido.",
  });
});
