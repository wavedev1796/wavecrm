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

const vendedor = { id: "u1", role: "VENDEDOR" };

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
    mockPrisma().service.createStage("p1", { name: "Nueva" }, vendedor),
    NotFoundException,
  );
  const { service } = mockPrisma({
    pipeline: { findUnique: { id: "p1" } },
    stage: { create: ({ data }) => data },
  });
  assert.deepEqual(await service.createStage("p1", { name: "Nueva", position: 3 }, vendedor), {
    name: "Nueva",
    position: 3,
    pipelineId: "p1",
  });
});

test("mover una etapa a una posición ocupada intercambia las dos", async () => {
  await assert.rejects(mockPrisma().service.updateStage("s1", {}, vendedor), NotFoundException);
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
  await service.updateStage("s1", { position: 2 }, vendedor);
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
  const stage = {
    stage: { findUnique: { id: "s1", pipelineId: "p1", probability: 10, position: 1, requirements: [] }, findMany: [] },
  };
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
    reason: null,
  });
});

test("editar negocio: 404 y no deja el negocio sin contacto ni empresa", async () => {
  await assert.rejects(
    mockPrisma().service.updateDeal("d1", { title: "X" }, vendedor),
    NotFoundException,
  );
  const { service } = mockPrisma({
    deal: {
      findUnique: { id: "d1", status: "OPEN", contactId: "c1", companyId: null, _count: { items: 0 } },
    },
  });
  await assert.rejects(
    service.updateDeal("d1", { contactId: null }, vendedor),
    /contacto o una empresa/,
  );
});

test("eliminar, ver ficha e historial de un negocio", async () => {
  await assert.rejects(mockPrisma({ deal: missing }).service.deleteDeal("d1", vendedor), NotFoundException);
  await assert.rejects(mockPrisma().service.findDeal("d1"), NotFoundException);
  await assert.rejects(mockPrisma({ deal: { count: 0 } }).service.history("d1"), NotFoundException);

  const { service, called } = mockPrisma({
    deal: { findUnique: { id: "d1", title: "Cuenta", status: "OPEN" }, count: 1 },
    auditLog: { findMany: [{ action: "WON" }] },
    dealStageHistory: { findMany: [{ id: "h1" }] },
  });
  await service.deleteDeal("d1", vendedor);
  assert.equal(called("deal.delete").length, 1);
  assert.deepEqual(await service.findDeal("d1"), {
    id: "d1",
    title: "Cuenta",
    status: "OPEN",
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
  const user = { sub: "u1", role: "VENDEDOR" };
  c.owners();
  c.pipelines();
  c.createPipeline({ name: "P" });
  c.updatePipeline("p1", { name: "Q" });
  c.deletePipeline("p1");
  c.createStage("p1", { name: "E" }, user);
  c.updateStage("s1", { name: "F" }, user);
  c.deleteStage("s1");
  c.board({ pipelineId: "p1" });
  c.board({ pipelineId: "p1", column: "LOST", page: 2 });
  c.listDeals({ page: 1 });
  c.createDeal({ title: "N" }, user);
  c.saveItems("d1", { items: [] }, user);
  c.previewTransition("d1", { to: "s2" }, user);
  c.history("d1");
  c.createActivity("d1", { type: "CALL" }, user);
  c.completeActivity("d1", "a1");
  c.win("d1", { closedAt: undefined }, user);
  c.lose("d1", { lossReason: "PRICE" }, user);
  c.reopen("d1", { reason: "Error" }, user);
  c.getDeal("d1");
  c.moveDeal("d1", { stageId: "s2" }, user);
  c.updateDeal("d1", { title: "M" }, user);
  c.deleteDeal("d1", user);
  assert.deepEqual(
    calls.map(([name]) => name),
    [
      "listOwners", "listPipelines", "createPipeline", "updatePipeline", "deletePipeline",
      "createStage", "updateStage", "deleteStage", "board", "boardColumn", "listDeals", "createDeal",
      "saveItems", "previewTransition", "history", "createActivity", "completeActivity",
      "transition", "transition", "transition", "findDeal", "transition", "updateDeal", "deleteDeal",
    ],
  );
  // Ganar, perder, reabrir y mover pasan por la misma transición, con el rol del token.
  const actor = { id: "u1", role: "VENDEDOR" };
  assert.deepEqual(
    calls.filter(([n]) => n === "transition").map(([, ...args]) => args),
    [
      ["d1", "WON", { closedAt: undefined }, actor],
      ["d1", "LOST", { lossReason: "PRICE" }, actor],
      ["d1", "REOPEN", { reason: "Error" }, actor],
      ["d1", "s2", {}, actor],
    ],
  );
  assert.deepEqual(calls.find(([n]) => n === "previewTransition"), ["previewTransition", "d1", "s2", actor]);
  assert.deepEqual(calls.find(([n]) => n === "board"), ["board", "p1"]);
  assert.deepEqual(calls.find(([n]) => n === "boardColumn"), ["boardColumn", "p1", "LOST", 2]);
});

const boardStages = [
  { id: "s1", name: "Contactado", position: 1, probability: 10 },
  { id: "s2", name: "Ganado", position: 2, probability: 100 },
];

test("el tablero trae 10 tarjetas por columna con la cantidad y el valor de todas", async () => {
  const { service, called } = mockPrisma({
    pipeline: { findUnique: { id: "p1", name: "Ventas" } },
    stage: { findMany: boardStages },
    deal: {
      groupBy: [
        { stageId: "s1", status: "OPEN", _count: { _all: 12 }, _sum: { value: new Prisma.Decimal("1200.10") } },
        { stageId: "s2", status: "WON", _count: { _all: 1 }, _sum: { value: new Prisma.Decimal("50") } },
        { stageId: "s1", status: "LOST", _count: { _all: 2 }, _sum: { value: new Prisma.Decimal("999") } },
      ],
      findMany: ({ where }) => [{ id: where.stageId ?? where.status }],
    },
  });
  const board = await service.board("p1");
  assert.deepEqual(
    board.stages.map((s) => [s.id, s.count, s.value, s.deals]),
    [
      ["s1", 12, "1200.10", [{ id: "s1" }]],
      ["s2", 1, "50.00", [{ id: "s2" }]],
    ],
  );
  assert.deepEqual(board.lost, { count: 2, value: "999.00", deals: [{ id: "LOST" }] });
  const pages = called("deal.findMany");
  assert.deepEqual(pages[0].where, { pipelineId: "p1", stageId: "s1", status: { not: "LOST" } });
  assert.deepEqual([pages[0].skip, pages[0].take], [0, 10]);
  assert.deepEqual(pages.at(-1).where, { pipelineId: "p1", status: "LOST" });
});

test("los perdidos van a su columna y no suman al valor abierto ni al ganado", async () => {
  const { service } = mockPrisma({
    pipeline: { findUnique: { id: "p1" } },
    stage: { findMany: boardStages },
    deal: {
      groupBy: [
        { stageId: "s1", status: "OPEN", _count: { _all: 3 }, _sum: { value: new Prisma.Decimal("300") } },
        { stageId: "s1", status: "LOST", _count: { _all: 1 }, _sum: { value: new Prisma.Decimal("999") } },
      ],
      findMany: [],
    },
  });
  const { metrics, stages } = await service.board("p1");
  assert.deepEqual(metrics, {
    open: { count: 3, value: "300.00" },
    won: { count: 0, value: "0.00" },
    lost: { count: 1, value: "999.00" },
  });
  assert.equal(stages[0].value, "300.00");
});

test("ver más pide la página siguiente de una columna con el mismo filtro y orden", async () => {
  const { service, called } = mockPrisma({ deal: { findMany: [{ id: "d11" }] } });
  assert.deepEqual(await service.boardColumn("p1", "LOST", 2), { deals: [{ id: "d11" }], page: 2 });
  const query = called("deal.findMany")[0];
  assert.deepEqual(query.where, { pipelineId: "p1", status: "LOST" });
  assert.deepEqual([query.skip, query.take], [10, 10]);
  assert.deepEqual(query.orderBy, [{ updatedAt: "desc" }, { id: "asc" }]);
  await service.boardColumn("p1", "s1", 1);
  assert.deepEqual(called("deal.findMany")[1].where, { pipelineId: "p1", stageId: "s1", status: { not: "LOST" } });
});
