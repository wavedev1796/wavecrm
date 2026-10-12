// Pipelines, etapas, listado, ficha, historial y traducción de errores de Prisma del PipelineService.
// Los cierres (ganar, perder, reabrir) viven en pipeline.service.test.cjs.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
} = require("@nestjs/common");
const { Prisma } = require("@wave/database");
const {
  PipelineService,
} = require("../../../dist/modules/pipeline/pipeline.service.js");
const {
  PipelineController,
} = require("../../../dist/modules/pipeline/pipeline.controller.js");

/** Un delete de un registro que no existe: Prisma lanza P2025. */
const missing = {
  delete: () => {
    throw new Prisma.PrismaClientKnownRequestError("x", { code: "P2025", clientVersion: "6" });
  },
};

/** Prisma de mentira: cada modelo responde lo que el test le pase y registra las llamadas. */
function mockPrisma(models = {}) {
  const calls = [];
  const prisma = new Proxy(
    {},
    {
      get(target, model) {
        if (model === "$transaction")
          return (arg) => (Array.isArray(arg) ? Promise.all(arg) : arg(prisma));
        target[model] ??= new Proxy(
          {},
          {
            get: (_, method) => async (args) => {
              calls.push([model + "." + method, args]);
              const answer = models[model]?.[method];
              return typeof answer === "function" ? answer(args) : (answer ?? null);
            },
          },
        );
        return target[model];
      },
    },
  );
  const called = (name) => calls.filter(([n]) => n === name).map(([, a]) => a);
  return { service: new PipelineService(prisma), called };
}

test("pipelines y responsables se listan con su orden y filtro", async () => {
  const { service, called } = mockPrisma({
    user: { findMany: [{ id: "u1", name: "Ana" }] },
    pipeline: { findMany: [] },
  });
  assert.deepEqual(await service.listOwners(), [{ id: "u1", name: "Ana" }]);
  assert.equal(called("user.findMany")[0].where.active, true);
  await service.listPipelines();
  assert.deepEqual(called("pipeline.findMany")[0].orderBy[0], { isDefault: "desc" });
});

test("el primer pipeline nace predeterminado; los siguientes solo si se pide", async () => {
  const first = mockPrisma({ pipeline: { count: 0, create: ({ data }) => data } });
  assert.deepEqual(await first.service.createPipeline({ name: "Ventas" }), {
    name: "Ventas",
    isDefault: true,
  });
  assert.equal(first.called("pipeline.updateMany").length, 1);

  const second = mockPrisma({ pipeline: { count: 1, create: ({ data }) => data } });
  assert.equal((await second.service.createPipeline({ name: "Otro" })).isDefault, false);
  assert.equal(second.called("pipeline.updateMany").length, 0);
});

test("editar pipeline: inexistente, quitar el predeterminado y marcar otro", async () => {
  await assert.rejects(
    mockPrisma().service.updatePipeline("p1", { name: "X" }),
    NotFoundException,
  );
  await assert.rejects(
    mockPrisma({ pipeline: { findUnique: { id: "p1", isDefault: true } } }).service.updatePipeline(
      "p1",
      { isDefault: false },
    ),
    BadRequestException,
  );
  const { service, called } = mockPrisma({
    pipeline: { findUnique: { id: "p2", isDefault: false }, update: ({ data }) => data },
  });
  assert.deepEqual(await service.updatePipeline("p2", { isDefault: true }), { isDefault: true });
  assert.equal(called("pipeline.updateMany").length, 1);
});

test("eliminar pipeline exige que no sea predeterminado, sin negocios ni historial", async () => {
  const pipeline = { id: "p2", isDefault: false };
  await assert.rejects(mockPrisma().service.deletePipeline("p2"), NotFoundException);
  await assert.rejects(
    mockPrisma({ pipeline: { findUnique: { ...pipeline, isDefault: true } } }).service.deletePipeline("p2"),
    BadRequestException,
  );
  await assert.rejects(
    mockPrisma({ pipeline: { findUnique: pipeline }, deal: { count: 3 } }).service.deletePipeline("p2"),
    /tiene negocios/,
  );
  await assert.rejects(
    mockPrisma({
      pipeline: { findUnique: pipeline },
      deal: { count: 0 },
      dealStageHistory: { count: 1 },
    }).service.deletePipeline("p2"),
    /conserva historial/,
  );
  const ok = mockPrisma({
    pipeline: { findUnique: pipeline },
    deal: { count: 0 },
    dealStageHistory: { count: 0 },
  });
  await ok.service.deletePipeline("p2");
  assert.deepEqual(ok.called("pipeline.delete")[0], { where: { id: "p2" } });
});

test("crear etapa exige el pipeline y la guarda dentro de él", async () => {
  await assert.rejects(
    mockPrisma().service.createStage("p1", { name: "Nueva" }),
    NotFoundException,
  );
  const { service } = mockPrisma({
    pipeline: { findUnique: { id: "p1" } },
    stage: { create: ({ data }) => data },
  });
  assert.deepEqual(await service.createStage("p1", { name: "Nueva", position: 3 }), {
    name: "Nueva",
    position: 3,
    pipelineId: "p1",
  });
});

test("mover una etapa a una posición ocupada intercambia las dos", async () => {
  await assert.rejects(mockPrisma().service.updateStage("s1", {}), NotFoundException);
  const stages = {
    s1: { id: "s1", pipelineId: "p1", position: 1 },
    s2: { id: "s2", pipelineId: "p1", position: 2 },
  };
  const { service, called } = mockPrisma({
    stage: {
      findUnique: ({ where }) =>
        where.id
          ? stages[where.id]
          : Object.values(stages).find((s) => s.position === where.pipelineId_position.position),
      aggregate: { _max: { position: 2 } },
      update: ({ data }) => data,
    },
  });
  await service.updateStage("s1", { position: 2 });
  assert.deepEqual(
    called("stage.update").map(({ where, data }) => [where.id, data.position]),
    [
      ["s1", 3],
      ["s2", 1],
      ["s1", 2],
    ],
  );
});

test("eliminar etapa exige que no tenga negocios ni historial", async () => {
  await assert.rejects(mockPrisma({ stage: missing }).service.deleteStage("s1"), NotFoundException);
  await assert.rejects(
    mockPrisma({ deal: { count: 1 } }).service.deleteStage("s1"),
    /Mueve sus negocios/,
  );
  await assert.rejects(
    mockPrisma({ deal: { count: 0 }, dealStageHistory: { count: 2 } }).service.deleteStage("s1"),
    /conserva historial/,
  );
  const ok = mockPrisma({ deal: { count: 0 }, dealStageHistory: { count: 0 } });
  await ok.service.deleteStage("s1");
  assert.equal(ok.called("stage.delete").length, 1);
});

test("listado de negocios: búsqueda sin mayúsculas, página y total de páginas", async () => {
  const { service, called } = mockPrisma({ deal: { findMany: [{ id: "d1" }], count: 21 } });
  const result = await service.listDeals({ page: 2, limit: 10, search: "andina" });
  assert.deepEqual(result.meta, { page: 2, limit: 10, total: 21, totalPages: 3 });
  const query = called("deal.findMany")[0];
  assert.deepEqual(query.where.title, { contains: "andina", mode: "insensitive" });
  assert.equal(query.skip, 10);
});

test("el tablero de un pipeline inexistente responde 404", async () => {
  await assert.rejects(mockPrisma().service.board("nope"), NotFoundException);
});

test("crear negocio: responsable activo, por defecto quien lo crea, y primer movimiento", async () => {
  const dto = { pipelineId: "p1", stageId: "s1", title: "Cuenta", contactId: "c1" };
  const stage = { stage: { findUnique: { id: "s1", pipelineId: "p1", probability: 10 } } };
  await assert.rejects(
    mockPrisma(stage).service.createDeal(dto, "u1"),
    /responsable activo/,
  );
  const { service, called } = mockPrisma({
    ...stage,
    user: { findFirst: { id: "u1" } },
    deal: { create: ({ data }) => ({ id: "d1", ...data }) },
  });
  const deal = await service.createDeal(dto, "u1");
  assert.equal(deal.ownerId, "u1");
  assert.deepEqual(called("dealStageHistory.create")[0].data, {
    dealId: "d1",
    fromStageId: null,
    toStageId: "s1",
    changedById: "u1",
  });
});

test("editar negocio: 404 y no deja el negocio sin contacto ni empresa", async () => {
  await assert.rejects(
    mockPrisma().service.updateDeal("d1", { title: "X" }, "u1"),
    NotFoundException,
  );
  const { service } = mockPrisma({
    deal: {
      findUnique: { id: "d1", contactId: "c1", companyId: null, _count: { items: 0 } },
    },
  });
  await assert.rejects(
    service.updateDeal("d1", { contactId: null }, "u1"),
    /contacto o una empresa/,
  );
});

test("eliminar, ver ficha e historial de un negocio", async () => {
  await assert.rejects(mockPrisma({ deal: missing }).service.deleteDeal("d1"), NotFoundException);
  await assert.rejects(mockPrisma().service.findDeal("d1"), NotFoundException);
  await assert.rejects(mockPrisma({ deal: { count: 0 } }).service.history("d1"), NotFoundException);

  const { service, called } = mockPrisma({
    deal: { findUnique: { id: "d1", title: "Cuenta" }, count: 1 },
    auditLog: { findMany: [{ action: "WON" }] },
    dealStageHistory: { findMany: [{ id: "h1" }] },
  });
  await service.deleteDeal("d1");
  assert.equal(called("deal.delete").length, 1);
  assert.deepEqual(await service.findDeal("d1"), {
    id: "d1",
    title: "Cuenta",
    closures: [{ action: "WON" }],
  });
  assert.deepEqual(await service.history("d1"), [{ id: "h1" }]);
});

test("completar actividad: solo una pendiente y con fecha de cierre", async () => {
  await assert.rejects(
    mockPrisma({ activity: { findFirst: { status: "COMPLETED" } } }).service.completeActivity("d1", "a1"),
    ConflictException,
  );
  const { service } = mockPrisma({
    activity: { findFirst: { status: "PENDING" }, update: ({ data }) => data },
  });
  const done = await service.completeActivity("d1", "a1");
  assert.equal(done.status, "COMPLETED");
  assert.ok(done.completedAt instanceof Date);
});

test("los errores de Prisma se traducen a respuestas HTTP claras", async () => {
  const failing = (code) =>
    mockPrisma({
      pipeline: {
        count: () => {
          throw new Prisma.PrismaClientKnownRequestError("x", { code, clientVersion: "6" });
        },
      },
    }).service.createPipeline({ name: "X" });
  await assert.rejects(failing("P2002"), /posicion ya esta ocupada/);
  await assert.rejects(failing("P2003"), /referencias ya no existe/);
  await assert.rejects(failing("P2025"), NotFoundException);
  await assert.rejects(failing("P2034"), /Otra persona modifico/);
  await assert.rejects(failing("P9999"), Prisma.PrismaClientKnownRequestError);
});

test("el controlador delega cada ruta en el servicio con el usuario del token", async () => {
  const calls = [];
  const service = new Proxy({}, { get: (_, name) => (...args) => calls.push([name, ...args]) });
  const c = new PipelineController(service);
  const user = { sub: "u1" };
  c.owners();
  c.pipelines();
  c.createPipeline({ name: "P" });
  c.updatePipeline("p1", { name: "Q" });
  c.deletePipeline("p1");
  c.createStage("p1", { name: "E" });
  c.updateStage("s1", { name: "F" });
  c.deleteStage("s1");
  c.board("p1");
  c.listDeals({ page: 1 });
  c.createDeal({ title: "N" }, user);
  c.saveItems("d1", { items: [] });
  c.history("d1");
  c.createActivity("d1", { type: "CALL" }, user);
  c.completeActivity("d1", "a1");
  c.win("d1", { closedAt: undefined }, user);
  c.lose("d1", { lossReason: "PRICE" }, user);
  c.reopen("d1", user);
  c.getDeal("d1");
  c.moveDeal("d1", { stageId: "s2" }, user);
  c.updateDeal("d1", { title: "M" }, user);
  c.deleteDeal("d1");
  assert.deepEqual(
    calls.map(([name]) => name),
    [
      "listOwners", "listPipelines", "createPipeline", "updatePipeline", "deletePipeline",
      "createStage", "updateStage", "deleteStage", "board", "listDeals", "createDeal",
      "saveItems", "history", "createActivity", "completeActivity", "winDeal", "loseDeal",
      "reopenDeal", "findDeal", "moveDeal", "updateDeal", "deleteDeal",
    ],
  );
  assert.deepEqual(calls.find(([n]) => n === "winDeal"), ["winDeal", "d1", undefined, "u1"]);
  assert.deepEqual(calls.find(([n]) => n === "moveDeal"), ["moveDeal", "d1", "s2", "u1"]);
});
