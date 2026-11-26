const { test } = require("node:test");
const assert = require("node:assert/strict");
const { plainToInstance } = require("class-transformer");
const { validate } = require("class-validator");
const { ForbiddenException } = require("@nestjs/common");
const { SettingsService } = require("../../../dist/modules/settings/settings.service.js");
const { UpdateSettingsDto } = require("../../../dist/modules/settings/settings.dto.js");

const vendedor = { id: "user-1", role: "VENDEDOR" };
const admin = { id: "admin-1", role: "ADMIN" };

// Prisma en memoria: una fila AppSettings (o ninguna) y el registro de auditoría.
function mockPrisma(row = { id: 1, taxRate: 15 }) {
  const audit = [];
  const prisma = {
    appSettings: {
      findUnique: async () => row,
      upsert: async ({ update }) => (row = { id: 1, ...row, ...update }),
    },
    auditLog: { create: async ({ data }) => audit.push(data) },
    $transaction: async (run) => run(prisma),
  };
  return { prisma, audit };
}

test("get() devuelve la tarifa guardada, o 15 si falta la fila", async () => {
  assert.deepEqual(await new SettingsService(mockPrisma().prisma).get(), { taxRate: 15 });
  assert.deepEqual(await new SettingsService(mockPrisma({ id: 1, taxRate: 8 }).prisma).get(), { taxRate: 8 });
  assert.deepEqual(await new SettingsService(mockPrisma(null).prisma).get(), { taxRate: 15 });
});

test("un vendedor no cambia la configuración", async () => {
  const { prisma, audit } = mockPrisma();
  await assert.rejects(
    new SettingsService(prisma).update({ taxRate: 12 }, vendedor),
    (error) => error instanceof ForbiddenException && error.message === "Solo un administrador cambia la configuración.",
  );
  assert.equal(audit.length, 0);
});

test("el administrador cambia la tarifa y queda auditado", async () => {
  const { prisma, audit } = mockPrisma();
  assert.deepEqual(await new SettingsService(prisma).update({ taxRate: 12 }, admin), { taxRate: 12 });
  assert.deepEqual(audit, [
    { action: "UPDATED", entityType: "Settings", entityId: "1", userId: "admin-1", changes: { taxRate: { from: 15, to: 12 } } },
  ]);
});

test("guardar el mismo valor no escribe auditoría; sin fila, parte de 15", async () => {
  const same = mockPrisma();
  await new SettingsService(same.prisma).update({ taxRate: 15 }, admin);
  assert.equal(same.audit.length, 0);
  const empty = mockPrisma(null);
  await new SettingsService(empty.prisma).update({ taxRate: 8 }, admin);
  assert.equal(empty.audit[0].changes.taxRate.from, 15);
});

test("el DTO solo acepta una tarifa con código de Billing y lo dice", async () => {
  const check = async (taxRate) => (await validate(plainToInstance(UpdateSettingsDto, { taxRate }))).flatMap((e) => Object.values(e.constraints));
  for (const ok of [15, 8, 5, 0, "15"]) assert.deepEqual(await check(ok), []);
  for (const bad of [12, 14, 100])
    assert.ok((await check(bad)).includes("Elige un IVA que Wave Billing acepte: 15, 8, 5 o 0."), String(bad));
});

test("el DTO rechaza 101, -1 y 12.5 con IVA_INVALID", async () => {
  const check = async (taxRate) => (await validate(plainToInstance(UpdateSettingsDto, { taxRate }))).flatMap((e) => Object.values(e.constraints));
    for (const bad of [101, -1, 12.5, "12.5"])
    assert.ok((await check(bad)).includes("El IVA debe ser un porcentaje entero entre 0 y 100."), String(bad));
});
