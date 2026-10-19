const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} = require("@nestjs/common");
const { Prisma } = require("@wave/database");
const {
  PipelineService,
} = require("../../../dist/modules/pipeline/pipeline.service.js");

const item = (quantity, unitPrice, taxRate) => ({ quantity, unitPrice, taxRate });
const vendedor = { id: "user-1", role: "VENDEDOR" };
const admin = { id: "admin-1", role: "ADMIN" };
const day = (iso) => new Date(iso + "T00:00:00.000Z");

/**
 * Prisma en memoria con lo que lee y escribe el servicio. `$transaction` copia el estado y lo
 * restaura si la operación falla, como el ROLLBACK de la base.
 */
function mockPrisma({
  items = [item(1, 100, 15)],
  status = "OPEN",
  stageId = "stage-a",
  quotes = [],
  activities = [],
  deal: overrides = {},
} = {}) {
  const pipeline = { id: "pipe-1", name: "Ventas", isDefault: true };
  const stages = {
    "stage-a": { id: "stage-a", pipelineId: "pipe-1", name: "Contactado", probability: 10, position: 1, requirements: [] },
    "stage-n": { id: "stage-n", pipelineId: "pipe-1", name: "Negociación", probability: 50, position: 2, requirements: ["NEED", "NEXT_ACTIVITY"] },
    "stage-g": { id: "stage-g", pipelineId: "pipe-1", name: "Ganado", probability: 100, position: 3, requirements: [] },
  };
  const deal = {
    id: "deal-1",
    title: "Contrato",
    value: 100,
    status,
    pipelineId: "pipe-1",
    stageId,
    contactId: "contact-1",
    companyId: "company-1",
    ownerId: "user-1",
    need: null,
    solution: null,
    budget: null,
    budgetNote: null,
    expectedClose: null,
    closedAt: null,
    lossReason: null,
    lossDetail: null,
    ...overrides,
  };
  const state = {
    deal,
    history: [],
    audit: [],
    quotes: quotes.map((q, index) => ({ id: "q" + index, dealId: "deal-1", createdAt: new Date(index), ...q })),
    items: [...items],
    activities: [...activities],
  };
  const quoteMatches = (q, where = {}) =>
    (!where.id || (where.id.in ? where.id.in.includes(q.id) : q.id === where.id)) &&
    (!where.dealId || q.dealId === where.dealId) &&
    (!where.status || (where.status.in ? where.status.in.includes(q.status) : q.status === where.status)) &&
    (!where.number || q.number.startsWith(where.number.startsWith));
  const live = () => state.quotes.filter((q) => q.dealId === "deal-1" && q.status !== "SUPERSEDED");
  const full = () => ({
    ...state.deal,
    stage: stages[state.deal.stageId],
    items: state.items,
    quotes: live().sort((a, b) => b.createdAt - a.createdAt).slice(0, 1),
    _count: { items: state.items.length },
  });
  const byPipeline = (where) => {
    const ids = where.pipelineId?.in ?? [where.pipelineId];
    return Object.values(stages).filter((s) => ids.includes(s.pipelineId));
  };
  const matching = (where, orderBy) =>
    byPipeline(where)
      .filter(
        (s) =>
          where.probability === undefined ||
          (typeof where.probability === "object" ? s.probability < where.probability.lt : s.probability === where.probability),
      )
      .sort((a, b) => (orderBy?.position === "desc" ? b.position - a.position : a.position - b.position));
  const prisma = {
    pipeline: { findFirst: async () => pipeline, findUnique: async () => pipeline },
    stage: {
      create: async ({ data }) => data,
      update: async ({ where, data }) => Object.assign(stages[where.id], data),
      findMany: async ({ where }) => matching(where),
      findUnique: async ({ where }) => stages[where.id] ?? null,
      findFirst: async ({ where, orderBy }) => matching(where, orderBy)[0] ?? null,
    },
    user: { findFirst: async () => ({ id: "user-1" }) },
    deal: {
      findMany: async () => [full()],
      findUnique: async ({ where }) => (where.id === "deal-1" ? full() : null),
      findUniqueOrThrow: async () => full(),
      create: async ({ data }) => ({ id: "deal-2", ...data }),
      update: async ({ data }) => Object.assign(state.deal, data),
      delete: async () => state.deal,
    },
    dealItem: {
      findMany: async () => state.items,
      deleteMany: async () => {
        state.items = [];
      },
      createMany: async ({ data }) => {
        state.items = data;
      },
    },
    quote: {
      findFirst: async ({ where }) => state.quotes.filter((q) => quoteMatches(q, where)).at(-1) ?? null,
      findMany: async ({ where }) => state.quotes.filter((q) => quoteMatches(q, where)),
      create: async ({ data }) => {
        state.quotes.push({ id: "q" + state.quotes.length, createdAt: new Date(state.quotes.length), ...data });
        return data;
      },
      update: async ({ where, data }) => Object.assign(state.quotes.find((q) => q.id === where.id), data),
      updateMany: async ({ where, data }) => {
        for (const q of state.quotes) if (quoteMatches(q, where)) Object.assign(q, data);
      },
    },
    dealStageHistory: {
      create: async ({ data }) => {
        state.history.push(data);
        return data;
      },
      findFirst: async () => null,
    },
    auditLog: {
      create: async ({ data }) => {
        state.audit.push(data);
        return data;
      },
      findMany: async () => state.audit,
    },
    activity: {
      create: async ({ data }) => data,
      findFirst: async () => null,
      count: async ({ where }) =>
        state.activities.filter(
          (a) =>
            a.status === where.status &&
            (!where.type || where.type.in.includes(a.type)) &&
            (!where.dueAt || (a.dueAt && a.dueAt >= where.dueAt.gte)),
        ).length,
    },
  };
  prisma.$transaction = async (fn) => {
    const snapshot = structuredClone({ ...state, deal: { ...state.deal } });
    try {
      return await fn(prisma);
    } catch (error) {
      Object.assign(state.deal, snapshot.deal);
      for (const key of ["history", "audit", "quotes", "items"]) state[key] = snapshot[key];
      throw error;
    }
  };
  return { prisma, state };
}
const service = (prisma) => new PipelineService(prisma);
const codesOf = async (promise) => {
  const error = await promise.then(
    () => assert.fail("debía rechazar"),
    (e) => e,
  );
  assert.ok(error instanceof UnprocessableEntityException, String(error));
  return error.getResponse().errors.map((p) => p.code);
};
const ready = {
  need: "Tienda en línea",
  activities: [{ status: "PENDING", type: "CALL", dueAt: day("2999-01-01") }],
};

test("CRM-18: tablero agrupa negocios y calcula el valor por etapa", async () => {
  const { prisma } = mockPrisma();
  const board = await service(prisma).board();
  assert.equal(board.stages[0].count, 1);
  assert.equal(board.stages[0].value, "100.00");
  assert.equal(board.stages[1].value, "0.00");
});

test("avanzar con los requisitos cumplidos guarda etapa anterior, destino y usuario", async () => {
  const { prisma, state } = mockPrisma({ deal: { need: ready.need }, activities: ready.activities });
  const result = await service(prisma).transition("deal-1", "stage-n", { fromStageId: "stage-a" }, vendedor);
  assert.equal(result.stageId, "stage-n");
  assert.deepEqual(state.history, [
    { dealId: "deal-1", fromStageId: "stage-a", toStageId: "stage-n", changedById: "user-1", reason: null },
  ]);
});

test("avanzar sin requisitos responde 422 con los códigos y no escribe nada", async () => {
  const { prisma, state } = mockPrisma();
  assert.deepEqual(await codesOf(service(prisma).transition("deal-1", "stage-n", {}, vendedor)), [
    "NEED",
    "NEXT_ACTIVITY",
  ]);
  assert.equal(state.deal.stageId, "stage-a");
  assert.equal(state.history.length, 0);
});

test("retroceder exige motivo y lo guarda en el historial sin borrar datos", async () => {
  const { prisma, state } = mockPrisma({ stageId: "stage-n", deal: { need: ready.need } });
  assert.deepEqual(await codesOf(service(prisma).transition("deal-1", "stage-a", {}, vendedor)), ["REASON"]);
  await service(prisma).transition("deal-1", "stage-a", { reason: "El cliente pausó la compra" }, vendedor);
  assert.equal(state.deal.stageId, "stage-a");
  assert.equal(state.deal.need, "Tienda en línea");
  assert.equal(state.history[0].reason, "El cliente pausó la compra");
});

test("una etapa vista desactualizada responde 409", async () => {
  const { prisma, state } = mockPrisma({ stageId: "stage-n" });
  await assert.rejects(
    service(prisma).transition("deal-1", "stage-a", { fromStageId: "stage-a", reason: "Volver" }, vendedor),
    ConflictException,
  );
  assert.equal(state.history.length, 0);
});

test("dos cambios simultáneos: la transacción serializable que pierde responde 409", async () => {
  const { prisma } = mockPrisma();
  prisma.$transaction = async () => {
    throw new Prisma.PrismaClientKnownRequestError("conflicto", { code: "P2034", clientVersion: "6" });
  };
  await assert.rejects(service(prisma).transition("deal-1", "stage-n", {}, vendedor), ConflictException);
});

test("si falla el historial, el negocio no cambia de etapa", async () => {
  const { prisma, state } = mockPrisma({ deal: { need: ready.need }, activities: ready.activities });
  prisma.dealStageHistory.create = async () => {
    throw new Error("disco lleno");
  };
  await assert.rejects(service(prisma).transition("deal-1", "stage-n", {}, vendedor), /disco lleno/);
  assert.equal(state.deal.stageId, "stage-a");
});

test("ganar exige la propuesta aceptada y no crea otra cotización", async () => {
  const { prisma, state } = mockPrisma({ stageId: "stage-n", deal: { need: ready.need }, quotes: [{ number: "COT-000007", status: "SENT", total: "115.00" }] });
  assert.deepEqual(await codesOf(service(prisma).transition("deal-1", "WON", { closedAt: day("2026-10-01") }, vendedor)), ["ACCEPTANCE"]);
  state.quotes[0].status = "ACCEPTED";
  await service(prisma).transition("deal-1", "WON", { closedAt: day("2026-10-01") }, vendedor);
  assert.equal(state.quotes.length, 1);
  assert.equal(state.deal.status, "WON");
  assert.equal(state.deal.stageId, "stage-g");
  assert.equal(state.deal.closedAt.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.equal(state.history[0].toStageId, "stage-g");
  assert.equal(state.audit[0].action, "WON");
  assert.equal(state.audit[0].changes.quoteNumber, "COT-000007");
});

test("arrastrar a la etapa de 100 % es ganar con las mismas reglas", async () => {
  const { prisma } = mockPrisma({ stageId: "stage-n", deal: { need: ready.need }, quotes: [{ number: "COT-000001", status: "ACCEPTED", total: "115.00" }] });
  assert.deepEqual(await codesOf(service(prisma).transition("deal-1", "stage-g", {}, vendedor)), ["CLOSED_AT"]);
  const result = await service(prisma).transition("deal-1", "stage-g", { closedAt: day("2026-10-01") }, vendedor);
  assert.equal(result.status, "WON");
});

test("perder guarda motivo y fecha sin mover la etapa; solo desde abierto", async () => {
  const { prisma, state } = mockPrisma();
  assert.deepEqual(await codesOf(service(prisma).transition("deal-1", "LOST", {}, vendedor)), ["LOSS_REASON"]);
  await service(prisma).transition("deal-1", "LOST", { lossReason: "PRICE" }, vendedor);
  assert.equal(state.deal.status, "LOST");
  assert.equal(state.deal.lossReason, "PRICE");
  assert.equal(state.deal.lossDetail, null);
  assert.equal(state.deal.stageId, "stage-a");
  assert.ok(state.deal.closedAt instanceof Date);
  assert.equal(state.audit[0].action, "LOST");
  await assert.rejects(service(prisma).transition("deal-1", "LOST", { lossReason: "PRICE" }, admin), ConflictException);
});

test("un VENDEDOR no reabre, mueve, edita, borra ni cambia productos de un negocio cerrado", async () => {
  const { prisma, state } = mockPrisma({ status: "WON", stageId: "stage-g" });
  const s = service(prisma);
  await assert.rejects(s.transition("deal-1", "REOPEN", { reason: "Error" }, vendedor), ForbiddenException);
  await assert.rejects(s.previewTransition("deal-1", "REOPEN", vendedor), ForbiddenException);
  await assert.rejects(s.transition("deal-1", "stage-a", { reason: "Error" }, vendedor), ForbiddenException);
  await assert.rejects(s.updateDeal("deal-1", { title: "Otro" }, vendedor), ForbiddenException);
  await assert.rejects(s.deleteDeal("deal-1", vendedor), ForbiddenException);
  const lost = mockPrisma({ status: "LOST" });
  await assert.rejects(service(lost.prisma).saveItems("deal-1", [], vendedor), ForbiddenException);
  assert.equal(state.deal.status, "WON");
});

test("un ADMIN reabre un ganado con motivo, vuelve a su etapa y conserva la cotización", async () => {
  const { prisma, state } = mockPrisma({ status: "WON", stageId: "stage-g", quotes: [{ number: "COT-000001", status: "ACCEPTED", total: "115.00" }] });
  assert.deepEqual(await codesOf(service(prisma).transition("deal-1", "REOPEN", {}, admin)), ["REASON"]);
  await service(prisma).transition("deal-1", "REOPEN", { reason: "El cliente anuló la orden" }, admin);
  assert.equal(state.deal.status, "OPEN");
  assert.equal(state.deal.closedAt, null);
  assert.equal(state.deal.stageId, "stage-n"); // última etapa abierta: el mock no tiene historial de origen
  assert.equal(state.quotes.length, 1);
  assert.deepEqual(state.audit[0], {
    action: "REOPENED",
    entityType: "Deal",
    entityId: "deal-1",
    changes: { from: "WON", reason: "El cliente anuló la orden" },
    userId: "admin-1",
  });
  assert.equal(state.history[0].reason, "El cliente anuló la orden");
});

test("un ADMIN reabre un perdido en la etapa donde quedó", async () => {
  const { prisma, state } = mockPrisma({ status: "LOST", stageId: "stage-n", deal: { lossReason: "PRICE" } });
  await service(prisma).transition("deal-1", "REOPEN", { reason: "Volvió a escribir" }, admin);
  assert.equal(state.deal.status, "OPEN");
  assert.equal(state.deal.lossReason, null);
  assert.equal(state.deal.stageId, "stage-n");
  assert.equal(state.history.length, 0);
});

test("una etapa de otro pipeline responde 400 y un negocio inexistente 404", async () => {
  const { prisma } = mockPrisma();
  prisma.stage.findUnique = async () => ({ id: "foreign", pipelineId: "another-pipeline", probability: 10, position: 1, requirements: [] });
  await assert.rejects(service(prisma).transition("deal-1", "foreign", {}, vendedor), BadRequestException);
  await assert.rejects(service(prisma).transition("deal-9", "stage-n", {}, vendedor), NotFoundException);
  await assert.rejects(service(prisma).previewTransition("deal-9", "stage-n", vendedor), NotFoundException);
});

test("la consulta previa devuelve los pendientes, la propuesta y los productos sin escribir", async () => {
  const { prisma, state } = mockPrisma({ quotes: [{ number: "COT-000003", status: "SENT", total: "115.00" }] });
  const preview = await service(prisma).previewTransition("deal-1", "stage-n", vendedor);
  assert.deepEqual(
    preview.pending.map((p) => p.code),
    ["NEED", "NEXT_ACTIVITY"],
  );
  assert.deepEqual(preview.quote, { id: "q0", number: "COT-000003", status: "SENT" });
  assert.equal(preview.items, 1);
  assert.equal(state.history.length, 0);
});

test("mover a la misma etapa no escribe historial", async () => {
  const { prisma, state } = mockPrisma();
  await service(prisma).transition("deal-1", "stage-a", { fromStageId: "stage-a" }, vendedor);
  assert.equal(state.history.length, 0);
});

test("cambiar la etapa al editar pasa por las mismas reglas", async () => {
  const { prisma, state } = mockPrisma();
  assert.deepEqual(await codesOf(service(prisma).updateDeal("deal-1", { stageId: "stage-n" }, vendedor)), ["NEED", "NEXT_ACTIVITY"]);
  assert.equal(state.deal.stageId, "stage-a");
  await service(prisma).updateDeal("deal-1", { need: "Catálogo", decisionMaker: "Gerente" }, vendedor);
  assert.equal(state.deal.need, "Catálogo");
});

test("CRM-18: el negocio debe quedar asociado a un contacto o empresa", async () => {
  const { prisma } = mockPrisma();
  await assert.rejects(
    service(prisma).createDeal({ pipelineId: "pipe-1", stageId: "stage-a", title: "Sin relacion", value: 50 }, "user-1"),
    BadRequestException,
  );
});

test("un alta en una etapa con requisitos lista lo que falta", async () => {
  const { prisma } = mockPrisma();
  const body = { pipelineId: "pipe-1", stageId: "stage-n", title: "Directo", value: 50, companyId: "company-1" };
  assert.deepEqual(await codesOf(service(prisma).createDeal(body, "user-1")), ["NEED", "NEXT_ACTIVITY"]);
  const created = await service(prisma).createDeal({ ...body, stageId: "stage-a" }, "user-1");
  assert.equal(created.ownerId, "user-1");
});

test("CRM-21: no se crea un negocio directamente en una etapa de 100 %", async () => {
  const { prisma } = mockPrisma();
  await assert.rejects(
    service(prisma).createDeal({ pipelineId: "pipe-1", stageId: "stage-g", title: "Directo", value: 50, companyId: "company-1" }, "user-1"),
    BadRequestException,
  );
});

test("CRM-20: guardar productos recalcula el valor y ordena las filas", async () => {
  const { prisma, state } = mockPrisma();
  await service(prisma).saveItems(
    "deal-1",
    [
      { description: "Pagina web", quantity: 1, unitPrice: 1400, taxRate: 15 },
      { description: "Mantenimiento", quantity: 1, unitPrice: 1000, taxRate: 12 },
    ],
    vendedor,
  );
  assert.equal(state.deal.value.toFixed(2), "2400.00");
  assert.deepEqual(
    state.items.map((i) => [i.description, i.position, i.dealId]),
    [
      ["Pagina web", 0, "deal-1"],
      ["Mantenimiento", 1, "deal-1"],
    ],
  );
});

test("CRM-20: sin productos el valor queda como estaba para escribirlo a mano", async () => {
  const { prisma, state } = mockPrisma();
  await service(prisma).saveItems("deal-1", [], vendedor);
  assert.equal(state.deal.value, 100);
});

test("CRM-20: los productos de un negocio ganado no se cambian", async () => {
  const { prisma } = mockPrisma({ status: "WON", stageId: "stage-g" });
  await assert.rejects(service(prisma).saveItems("deal-1", [], admin), ConflictException);
});

test("CRM-20: con productos el monto no se edita a mano", async () => {
  const { prisma } = mockPrisma();
  await assert.rejects(service(prisma).updateDeal("deal-1", { value: 10 }, vendedor), BadRequestException);
});

test("CRM-20: la actividad del negocio copia contacto y empresa y la asigna a quien la crea", async () => {
  const { prisma } = mockPrisma();
  const created = await service(prisma).createActivity("deal-1", { type: "CALL", subject: "Llamar al cliente" }, "user-1");
  assert.deepEqual(
    [created.dealId, created.companyId, created.contactId, created.assigneeId],
    ["deal-1", "company-1", "contact-1", "user-1"],
  );
  await assert.rejects(service(prisma).completeActivity("deal-1", "ajena"), NotFoundException);
});

const future = day("2999-01-31");

test("registrar propuesta crea la COT enviada con los totales y desactualiza la anterior", async () => {
  const { prisma, state } = mockPrisma({ quotes: [{ number: "COT-000004", status: "SENT", total: "115.00" }] });
  await service(prisma).createQuote("deal-1", { validUntil: future }, vendedor);
  assert.equal(state.quotes[0].status, "SUPERSEDED");
  const quote = state.quotes[1];
  assert.deepEqual(
    [quote.number, quote.status, quote.dealId, quote.validUntil.toISOString()],
    ["COT-000005", "SENT", "deal-1", "2999-01-31T00:00:00.000Z"],
  );
  assert.ok(quote.sentAt instanceof Date);
  assert.deepEqual([quote.subtotal, quote.tax, quote.total].map((d) => d.toFixed(2)), ["100.00", "15.00", "115.00"]);
});

test("la propuesta exige productos, negocio abierto, envío no futuro y vigencia posterior al envío", async () => {
  await assert.rejects(service(mockPrisma({ items: [] }).prisma).createQuote("deal-1", { validUntil: future }, vendedor), BadRequestException);
  await assert.rejects(
    service(mockPrisma({ status: "WON", stageId: "stage-g" }).prisma).createQuote("deal-1", { validUntil: future }, admin),
    ConflictException,
  );
  await assert.rejects(
    service(mockPrisma({ status: "LOST" }).prisma).createQuote("deal-1", { validUntil: future }, vendedor),
    ForbiddenException,
  );
  const { prisma } = mockPrisma();
  await assert.rejects(service(prisma).createQuote("deal-1", { validUntil: future, sentAt: future }, vendedor), /no puede ser futura/);
  await assert.rejects(
    service(prisma).createQuote("deal-1", { validUntil: day("2026-01-01"), sentAt: day("2026-02-01") }, vendedor),
    /vigencia/,
  );
});

test("aceptar una propuesta guarda fecha y evidencia, dentro de su vigencia", async () => {
  const sent = { number: "COT-000001", status: "SENT", total: "115.00", sentAt: day("2026-10-01"), validUntil: day("2026-10-05") };
  const vencida = mockPrisma({ quotes: [sent] });
  await assert.rejects(
    service(vencida.prisma).acceptQuote("deal-1", "q0", { acceptedAt: day("2026-10-10"), acceptanceNote: "Orden de compra 55" }, vendedor),
    /venció/,
  );
  const { prisma, state } = mockPrisma({ quotes: [{ ...sent, validUntil: future }] });
  await assert.rejects(
    service(prisma).acceptQuote("deal-1", "q0", { acceptedAt: day("2026-09-30"), acceptanceNote: "Correo" }, vendedor),
    BadRequestException,
  );
  await service(prisma).acceptQuote("deal-1", "q0", { acceptedAt: day("2026-10-02"), acceptanceNote: "Orden de compra 55" }, vendedor);
  assert.deepEqual(
    [state.quotes[0].status, state.quotes[0].acceptedAt.toISOString(), state.quotes[0].acceptanceNote],
    ["ACCEPTED", "2026-10-02T00:00:00.000Z", "Orden de compra 55"],
  );
  await assert.rejects(
    service(prisma).acceptQuote("deal-1", "q0", { acceptedAt: day("2026-10-02"), acceptanceNote: "Otra vez" }, vendedor),
    ConflictException,
  );
  await assert.rejects(
    service(prisma).acceptQuote("deal-1", "q9", { acceptedAt: day("2026-10-02"), acceptanceNote: "Ajena" }, vendedor),
    NotFoundException,
  );
});

test("guardar productos con los mismos importes conserva la propuesta enviada", async () => {
  const quote = { number: "COT-000001", status: "SENT", subtotal: "100.00", tax: "15.00", total: "115.00" };
  const { prisma, state } = mockPrisma({ quotes: [quote] });
  await service(prisma).saveItems("deal-1", [{ description: "Web", quantity: 1, unitPrice: 100, taxRate: 15 }], vendedor);
  assert.equal(state.quotes[0].status, "SENT");
});

test("guardar productos con otros importes deja la propuesta desactualizada, sin borrarla", async () => {
  const quote = { number: "COT-000001", status: "ACCEPTED", subtotal: "100.00", tax: "15.00", total: "115.00" };
  const { prisma, state } = mockPrisma({ quotes: [quote] });
  await service(prisma).saveItems("deal-1", [{ description: "Web", quantity: 2, unitPrice: 100, taxRate: 15 }], vendedor);
  assert.equal(state.quotes.length, 1);
  assert.equal(state.quotes[0].status, "SUPERSEDED");
});

test("una actividad ya realizada nace completada y no admite fecha futura", async () => {
  const { prisma } = mockPrisma();
  const done = await service(prisma).createActivity(
    "deal-1",
    { type: "CALL", subject: "Primera llamada", completedAt: day("2026-10-01") },
    "user-1",
  );
  assert.equal(done.status, "COMPLETED");
  assert.equal(done.completedAt.toISOString(), "2026-10-01T00:00:00.000Z");
  await assert.rejects(
    service(prisma).createActivity("deal-1", { type: "CALL", subject: "Llamada", completedAt: future }, "user-1"),
    BadRequestException,
  );
});

test("requisitos de etapa sin cambios no exigen ADMIN; cambiarlos sí", async () => {
  const { prisma } = mockPrisma();
  const s = service(prisma);
  await s.updateStage("stage-n", { name: "Negociación", requirements: ["NEXT_ACTIVITY", "NEED"] }, vendedor);
  await assert.rejects(s.updateStage("stage-n", { requirements: ["NEED"] }, vendedor), ForbiddenException);
  await assert.rejects(s.createStage("pipe-1", { name: "Nueva", position: 9, probability: 20, requirements: ["NEED"] }, vendedor), ForbiddenException);
  await s.createStage("pipe-1", { name: "Nueva", position: 9, probability: 20 }, vendedor);
  const updated = await s.updateStage("stage-n", { requirements: ["NEED"] }, admin);
  assert.deepEqual(updated.requirements, ["NEED"]);
});
