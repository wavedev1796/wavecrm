const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
} = require("@nestjs/common");
const {
  PipelineService,
} = require("../../../dist/modules/pipeline/pipeline.service.js");

const item = (quantity, unitPrice, taxRate) => ({ quantity, unitPrice, taxRate });

function mockPrisma({
  items = [item(1, 120, 15)],
  status = "OPEN",
  stageId = "stage-a",
  quotes = [],
} = {}) {
  const pipeline = { id: "pipe-1", name: "Ventas", isDefault: true };
  const stages = {
    "stage-a": { id: "stage-a", pipelineId: "pipe-1", name: "Nuevo", probability: 10, position: 1 },
    "stage-b": { id: "stage-b", pipelineId: "pipe-1", name: "Ganado", probability: 100, position: 2 },
  };
  const deal = {
    id: "deal-1",
    title: "Contrato",
    value: 120,
    status,
    pipelineId: "pipe-1",
    stageId,
    contactId: null,
    companyId: "company-1",
  };
  const calls = { history: [], audit: [], quotes: [...quotes], items: [...items] };
  const full = () => ({
    ...deal,
    stage: stages[deal.stageId],
    _count: { items: calls.items.length },
  });
  const matching = (where, orderBy) =>
    Object.values(stages)
      .filter(
        (s) =>
          s.pipelineId === where.pipelineId &&
          (where.probability === undefined ||
            (typeof where.probability === "object"
              ? s.probability < where.probability.lt
              : s.probability === where.probability)),
      )
      .sort((a, b) =>
        orderBy?.position === "desc" ? b.position - a.position : a.position - b.position,
      );
  const prisma = {
    pipeline: { findFirst: async () => pipeline },
    stage: {
      findMany: async () => Object.values(stages),
      findUnique: async ({ where }) => stages[where.id] ?? null,
      findFirst: async ({ where, orderBy }) => matching(where, orderBy)[0] ?? null,
    },
    deal: {
      findMany: async () => [deal],
      findUnique: async () => full(),
      findUniqueOrThrow: async () => full(),
      update: async ({ data }) => Object.assign(deal, data),
    },
    dealItem: {
      findMany: async () => calls.items,
      deleteMany: async () => {
        calls.items = [];
      },
      createMany: async ({ data }) => {
        calls.items = data;
      },
    },
    quote: {
      findFirst: async () => calls.quotes.at(-1) ?? null,
      findMany: async () => calls.quotes,
      create: async ({ data }) => {
        calls.quotes.push(data);
        return data;
      },
      deleteMany: async () => {
        calls.quotes = [];
      },
    },
    dealStageHistory: {
      create: async ({ data }) => {
        calls.history.push(data);
        return data;
      },
      findFirst: async () => null,
    },
    auditLog: {
      create: async ({ data }) => {
        calls.audit.push(data);
        return data;
      },
      findMany: async () => calls.audit,
    },
    activity: {
      create: async ({ data }) => data,
      findFirst: async () => null,
    },
  };
  prisma.$transaction = (fn) => fn(prisma);
  return { prisma, deal, calls };
}
const service = (prisma) => new PipelineService(prisma);

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
  assert.equal(calls.quotes[0].number, "COT-000001");
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

test("CRM-20: guardar productos recalcula el valor y ordena las filas", async () => {
  const { prisma, deal, calls } = mockPrisma();
  await service(prisma).saveItems("deal-1", [
    { description: "Pagina web", quantity: 1, unitPrice: 1400, taxRate: 15 },
    { description: "Mantenimiento", quantity: 1, unitPrice: 1000, taxRate: 15 },
  ]);
  assert.equal(deal.value.toFixed(2), "2400.00");
  assert.deepEqual(
    calls.items.map((i) => [i.description, i.position, i.dealId]),
    [
      ["Pagina web", 0, "deal-1"],
      ["Mantenimiento", 1, "deal-1"],
    ],
  );
});

test("CRM-20: sin productos el valor queda como estaba para escribirlo a mano", async () => {
  const { prisma, deal } = mockPrisma();
  await service(prisma).saveItems("deal-1", []);
  assert.equal(deal.value, 120);
});

test("CRM-20: los productos de un negocio ganado no se cambian", async () => {
  const { prisma } = mockPrisma({ status: "WON", stageId: "stage-b" });
  await assert.rejects(service(prisma).saveItems("deal-1", []), ConflictException);
});

test("CRM-20: con productos el monto no se edita a mano", async () => {
  const { prisma } = mockPrisma();
  await assert.rejects(
    service(prisma).updateDeal("deal-1", { value: 10 }, "user-1"),
    BadRequestException,
  );
});

test("CRM-21: ganar exige productos y no crea cotizacion sin ellos", async () => {
  const { prisma, calls } = mockPrisma({ items: [] });
  await assert.rejects(
    service(prisma).winDeal("deal-1", undefined, "user-1"),
    BadRequestException,
  );
  assert.equal(calls.quotes.length, 0);
});

test("CRM-21: ganar crea la cotizacion con IVA por tarifa, pasa a 100 % y audita", async () => {
  const { prisma, deal, calls } = mockPrisma({
    items: [item(2, 10, 0), item(1, 100, 15)],
    quotes: [{ number: "COT-000041", status: "ACCEPTED", dealId: "otro" }],
  });
  await service(prisma).winDeal(
    "deal-1",
    new Date("2026-10-01T00:00:00.000Z"),
    "user-1",
  );
  const quote = calls.quotes.at(-1);
  assert.equal(quote.number, "COT-000042");
  assert.equal(quote.status, undefined); // DRAFT por defecto en el schema
  assert.deepEqual(
    [quote.subtotal, quote.tax, quote.total].map((d) => d.toFixed(2)),
    ["120.00", "15.00", "135.00"],
  );
  assert.equal(deal.status, "WON");
  assert.equal(deal.stageId, "stage-b");
  assert.equal(deal.closedAt.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.deepEqual(calls.history[0], {
    dealId: "deal-1",
    fromStageId: "stage-a",
    toStageId: "stage-b",
    changedById: "user-1",
  });
  assert.equal(calls.audit[0].action, "WON");
  assert.equal(calls.audit[0].changes.quoteNumber, "COT-000042");
});

test("CRM-21: la fecha de ganado no puede ser futura", async () => {
  const { prisma } = mockPrisma();
  const tomorrow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  await assert.rejects(
    service(prisma).winDeal("deal-1", tomorrow, "user-1"),
    BadRequestException,
  );
});

test("CRM-21: perder guarda motivo y fecha sin mover la etapa; solo desde abierto", async () => {
  const { prisma, deal, calls } = mockPrisma();
  await service(prisma).loseDeal("deal-1", { lossReason: "PRICE" }, "user-1");
  assert.equal(deal.status, "LOST");
  assert.equal(deal.lossReason, "PRICE");
  assert.equal(deal.lossDetail, null);
  assert.equal(deal.stageId, "stage-a");
  assert.ok(deal.closedAt instanceof Date);
  assert.equal(calls.audit[0].action, "LOST");
  const won = mockPrisma({ status: "WON", stageId: "stage-b" });
  await assert.rejects(
    service(won.prisma).loseDeal("deal-1", { lossReason: "PRICE" }, "user-1"),
    ConflictException,
  );
});

test("CRM-21: reabrir un ganado borra su borrador y vuelve a una etapa abierta", async () => {
  const { prisma, deal, calls } = mockPrisma({
    status: "WON",
    stageId: "stage-b",
    quotes: [{ number: "COT-000001", status: "DRAFT" }],
  });
  await service(prisma).reopenDeal("deal-1", "user-1");
  assert.equal(deal.status, "OPEN");
  assert.equal(deal.closedAt, null);
  assert.equal(deal.stageId, "stage-a");
  assert.equal(calls.quotes.length, 0);
  assert.equal(calls.audit[0].action, "REOPENED");
  assert.deepEqual(calls.audit[0].changes.deletedQuotes, ["COT-000001"]);
});

test("CRM-21: no se reabre un ganado cuya cotizacion ya salio de borrador", async () => {
  const { prisma } = mockPrisma({
    status: "WON",
    stageId: "stage-b",
    quotes: [{ number: "COT-000001", status: "SENT" }],
  });
  await assert.rejects(
    service(prisma).reopenDeal("deal-1", "user-1"),
    ConflictException,
  );
});

test("CRM-21: sacar un ganado de la etapa de 100 % lo reabre por el mismo camino", async () => {
  const { prisma, deal, calls } = mockPrisma({
    status: "WON",
    stageId: "stage-b",
    quotes: [{ number: "COT-000001", status: "DRAFT" }],
  });
  await service(prisma).moveDeal("deal-1", "stage-a", "user-1");
  assert.equal(deal.status, "OPEN");
  assert.equal(calls.quotes.length, 0);
  assert.equal(calls.audit[0].action, "REOPENED");
});

test("CRM-21: no se crea un negocio directamente en una etapa de 100 %", async () => {
  const { prisma } = mockPrisma();
  await assert.rejects(
    service(prisma).createDeal(
      {
        pipelineId: "pipe-1",
        stageId: "stage-b",
        title: "Directo",
        value: 50,
        companyId: "company-1",
      },
      "user-1",
    ),
    BadRequestException,
  );
});

test("CRM-20: la actividad del negocio copia contacto y empresa y la asigna a quien la crea", async () => {
  const { prisma } = mockPrisma();
  const created = await service(prisma).createActivity(
    "deal-1",
    { type: "CALL", subject: "Llamar al cliente" },
    "user-1",
  );
  assert.deepEqual(
    [created.dealId, created.companyId, created.contactId, created.assigneeId],
    ["deal-1", "company-1", null, "user-1"],
  );
  await assert.rejects(
    service(prisma).completeActivity("deal-1", "ajena"),
    NotFoundException,
  );
});
