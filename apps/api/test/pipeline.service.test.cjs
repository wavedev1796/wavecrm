const { test } = require("node:test");
const assert = require("node:assert/strict");
const { BadRequestException } = require("@nestjs/common");
const {
  PipelineService,
} = require("../dist/modules/pipeline/pipeline.service.js");

function mockPrisma() {
  const pipeline = { id: "pipe-1", name: "Ventas", isDefault: true };
  const stageA = {
    id: "stage-a",
    pipelineId: "pipe-1",
    name: "Nuevo",
    probability: 10,
    position: 1,
  };
  const stageB = {
    id: "stage-b",
    pipelineId: "pipe-1",
    name: "Ganado",
    probability: 100,
    position: 2,
  };
  const deal = {
    id: "deal-1",
    title: "Contrato",
    value: 120,
    pipelineId: "pipe-1",
    stageId: "stage-a",
    stage: stageA,
  };
  const calls = { history: [] };
  const prisma = {
    pipeline: { findFirst: async () => pipeline },
    stage: {
      findMany: async () => [stageA, stageB],
      findUnique: async ({ where }) =>
        where.id === "stage-a" ? stageA : stageB,
    },
    deal: {
      findMany: async () => [deal],
      findUnique: async () => deal,
      update: async ({ data }) => ({ ...deal, ...data, stage: stageB }),
    },
    dealStageHistory: {
      create: async ({ data }) => {
        calls.history.push(data);
        return data;
      },
    },
  };
  prisma.$transaction = (fn) => fn(prisma);
  return { prisma, calls, stageB };
}

test("CRM-18: tablero agrupa negocios y calcula el valor por etapa", async () => {
  const { prisma } = mockPrisma();
  const board = await new PipelineService(prisma).board();
  assert.equal(board.stages[0].count, 1);
  assert.equal(board.stages[0].value, "120.00");
  assert.equal(board.stages[1].value, "0.00");
});

test("CRM-18: mover negocio guarda etapa anterior, destino y responsable", async () => {
  const { prisma, calls } = mockPrisma();
  const result = await new PipelineService(prisma).moveDeal(
    "deal-1",
    "stage-b",
    "user-1",
  );
  assert.equal(result.stageId, "stage-b");
  assert.equal(result.status, "WON");
  assert.deepEqual(calls.history[0], {
    dealId: "deal-1",
    fromStageId: "stage-a",
    toStageId: "stage-b",
    changedById: "user-1",
  });
});

test("CRM-18: rechaza mover el negocio a una etapa de otro pipeline", async () => {
  const { prisma } = mockPrisma();
  prisma.stage.findUnique = async () => ({
    id: "foreign",
    pipelineId: "another-pipeline",
  });
  await assert.rejects(
    new PipelineService(prisma).moveDeal("deal-1", "foreign", "user-1"),
    BadRequestException,
  );
});

test("CRM-18: el negocio debe quedar asociado a un contacto o empresa", async () => {
  const { prisma } = mockPrisma();
  await assert.rejects(
    new PipelineService(prisma).createDeal(
      {
        pipelineId: "pipe-1",
        stageId: "stage-a",
        title: "Sin relacion",
        value: 50,
      },
      "user-1",
    ),
    BadRequestException,
  );
});
