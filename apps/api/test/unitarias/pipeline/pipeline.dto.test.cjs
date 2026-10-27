const { test } = require("node:test");
const assert = require("node:assert/strict");
const { plainToInstance } = require("class-transformer");
const { validate } = require("class-validator");
const {
  AcceptQuoteDto,
  BoardQueryDto,
  CreateQuoteDto,
  CreateDealActivityDto,
  CreateDealDto,
  CreatePipelineDto,
  CreateStageDto,
  DeleteDealsDto,
  ListDealsDto,
  LoseDealDto,
  MoveDealDto,
  RejectDealDto,
  ReopenDealDto,
  SaveDealItemsDto,
  TransitionQueryDto,
  UpdateDealDto,
  UpdatePipelineDto,
  UpdateStageDto,
  WinDealDto,
} = require("../../../dist/modules/pipeline/pipeline.dto.js");

/** Mensajes por campo, con las mismas opciones que el ValidationPipe global. */
async function errors(Dto, body) {
  const result = await validate(plainToInstance(Dto, body), {
    stopAtFirstError: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const messages = (error) =>
    error.constraints
      ? Object.values(error.constraints)
      : (error.children ?? []).flatMap(messages);
  return Object.fromEntries(result.map((error) => [error.property, messages(error)[0]]));
}

const deal = { title: "Web corporativa", value: "1500.50", pipelineId: "p1", stageId: "s1" };
const item = { description: "Página web", quantity: "2", unitPrice: "700", taxRate: "15" };

test("CRM-18: un negocio válido convierte monto y fecha y recorta los textos", async () => {
  const body = { ...deal, title: "  Web corporativa  ", expectedClose: "2026-12-01" };
  assert.deepEqual(await errors(CreateDealDto, body), {});
  const dto = plainToInstance(CreateDealDto, body);
  assert.equal(dto.title, "Web corporativa");
  assert.equal(dto.value, 1500.5);
  assert.ok(dto.expectedClose instanceof Date);
});

test("CRM-18: el negocio explica cada campo inválido", async () => {
  assert.deepEqual(
    await errors(CreateDealDto, {
      title: "W",
      value: "1.234",
      pipelineId: 5,
      stageId: "s1",
      expectedClose: "mañana",
    }),
    {
      title: "Revisa el nombre del negocio: entre 2 y 160 caracteres.",
      value: "Ingresa un monto valido con hasta dos decimales.",
      pipelineId: "Ingresa el pipeline.",
      expectedClose: "Ingresa una fecha valida.",
    },
  );
  // Un monto vacío no se convierte en 0.
  assert.equal(plainToInstance(CreateDealDto, { ...deal, value: " " }).value, " ");
});

test("CRM-18: los PATCH de negocio, pipeline y etapa aceptan campos sueltos", async () => {
  assert.deepEqual(await errors(UpdateDealDto, { value: "10" }), {});
  assert.deepEqual(await errors(UpdatePipelineDto, { isDefault: true }), {});
  assert.deepEqual(await errors(UpdateStageDto, { probability: "50" }), {});
  assert.deepEqual(await errors(MoveDealDto, {}), { stageId: "Ingresa la etapa." });
});

test("CRM-17: pipeline y etapa validan nombre, principal, probabilidad y color", async () => {
  assert.deepEqual(await errors(CreatePipelineDto, { name: "Ventas" }), {});
  assert.deepEqual(await errors(CreatePipelineDto, { name: "V", isDefault: "sí" }), {
    name: "Revisa el nombre: entre 2 y 100 caracteres.",
    isDefault: "Indica si el pipeline es principal con true o false.",
  });
  assert.deepEqual(
    await errors(CreateStageDto, { name: "Propuesta", position: "1", probability: "40", color: "#1A2b3C" }),
    {},
  );
  assert.deepEqual(
    await errors(CreateStageDto, { name: "Propuesta", position: "1.5", probability: "120", color: "rojo" }),
    {
      position: "La posicion debe ser un entero.",
      probability: "La probabilidad debe estar entre 0 y 100.",
      color: "Elige un color valido.",
    },
  );
});

test("ganar exige la fecha real de cierre y perder exige motivo y detalle si es OTHER", async () => {
  assert.deepEqual(await errors(WinDealDto, {}), { closedAt: "Ingresa la fecha real de cierre." });
  assert.deepEqual(await errors(WinDealDto, { closedAt: "2026-10-10", fromStageId: "s1" }), {});
  assert.ok(plainToInstance(WinDealDto, { closedAt: "2026-10-10T00:00:00.000Z" }).closedAt instanceof Date);
  assert.deepEqual(await errors(WinDealDto, { closedAt: "ayer" }), {
    closedAt: "Ingresa la fecha real de cierre.",
  });

  assert.deepEqual(await errors(LoseDealDto, {}), { lossReason: "Elige el motivo de la pérdida." });
  assert.deepEqual(await errors(LoseDealDto, { lossReason: "NEGOTIATION" }), {});
  assert.deepEqual(await errors(LoseDealDto, { lossReason: "OTHER" }), {
    lossDetail: "Ingresa el detalle del motivo.",
  });
  assert.deepEqual(await errors(LoseDealDto, { lossReason: "NEGOTIATION", lossDetail: "x" }), {
    lossDetail: "Revisa el detalle del motivo: entre 2 y 500 caracteres.",
  });
});

test("perder y rechazar aceptan solo sus motivos; el seguimiento es opcional y se valida entero", async () => {
  assert.deepEqual(await errors(LoseDealDto, { lossReason: "DO_NOT_CONTACT" }), { lossReason: "Elige el motivo de la pérdida." });
  assert.deepEqual(await errors(RejectDealDto, { lossReason: "BUDGET" }), { lossReason: "Elige el motivo del rechazo." });
  assert.deepEqual(await errors(RejectDealDto, { lossReason: "DO_NOT_CONTACT", fromStageId: "s1" }), {});
  assert.deepEqual(await errors(RejectDealDto, { lossReason: "OTHER" }), { lossDetail: "Ingresa el detalle del motivo." });
  const followUp = { type: "CALL", subject: "Retomar", dueAt: "2027-01-18" };
  assert.deepEqual(await errors(LoseDealDto, { lossReason: "NEED_POSTPONED", followUp }), {});
  assert.ok(plainToInstance(LoseDealDto, { lossReason: "NEED_POSTPONED", followUp }).followUp.dueAt instanceof Date);
  assert.deepEqual(await errors(LoseDealDto, { lossReason: "NEED_POSTPONED", followUp: { ...followUp, type: "FAX" } }), {
    followUp: "Elige el tipo del seguimiento.",
  });
});

test("la papelera borra entre 1 y 100 ids sin repetir, y el listado filtra por estado", async () => {
  const invalid = { ids: "Elige entre 1 y 100 negocios, sin repetir." };
  assert.deepEqual(await errors(DeleteDealsDto, { ids: ["d1", "d2"] }), {});
  for (const ids of [[], ["d1", "d1"], Array.from({ length: 101 }, (_, i) => "d" + i), "d1", [1]])
    assert.deepEqual(await errors(DeleteDealsDto, { ids }), invalid, JSON.stringify(ids));
  assert.deepEqual(await errors(ListDealsDto, { status: "REJECTED" }), {});
  assert.deepEqual(await errors(ListDealsDto, { status: "BORRADO" }), { status: "Elige un estado válido." });
});

test("reabrir exige motivo y mover acepta motivo, etapa de origen y fecha de cierre opcionales", async () => {
  assert.deepEqual(await errors(ReopenDealDto, {}), { reason: "Ingresa el motivo." });
  assert.deepEqual(await errors(ReopenDealDto, { reason: "x" }), {
    reason: "Revisa el motivo: entre 2 y 500 caracteres.",
  });
  assert.deepEqual(await errors(ReopenDealDto, { reason: "El cliente anuló la orden" }), {});
  assert.deepEqual(await errors(MoveDealDto, { stageId: "s2" }), {});
  assert.deepEqual(
    await errors(MoveDealDto, { stageId: "s2", fromStageId: "s1", reason: "Revisar", closedAt: "2026-10-01" }),
    {},
  );
  assert.deepEqual(await errors(MoveDealDto, { stageId: "s2", reason: "x".repeat(501) }), {
    reason: "Revisa el motivo: entre 2 y 500 caracteres.",
  });
  assert.deepEqual(await errors(TransitionQueryDto, {}), { to: "Ingresa el destino." });
});

test("el negocio documenta necesidad, solución, presupuesto y decisor, y los vacía con null", async () => {
  const body = { need: " Tienda ", solution: "Plan anual", budget: "5000.50", budgetNote: null, decisionMaker: "Gerente" };
  assert.deepEqual(await errors(UpdateDealDto, body), {});
  assert.equal(plainToInstance(UpdateDealDto, body).budget, 5000.5);
  assert.deepEqual(await errors(UpdateDealDto, { budget: "-1", need: "x" }), {
    need: "Revisa la necesidad: entre 2 y 2000 caracteres.",
    budget: "Ingresa un presupuesto válido de hasta 999999999999.99.",
  });
});

test("CRM-20: los productos convierten números y explican la fila inválida", async () => {
  assert.deepEqual(await errors(SaveDealItemsDto, { items: [item] }), {});
  const dto = plainToInstance(SaveDealItemsDto, { items: [item] });
  assert.equal(dto.items[0].quantity, 2);
  assert.equal(dto.items[0].taxRate, 15);
  // IVA editable: cualquier entero de 0 a 100, por ejemplo la tarifa anterior de 12 %.
  assert.deepEqual(await errors(SaveDealItemsDto, { items: [{ ...item, taxRate: "12" }] }), {});

  assert.deepEqual(await errors(SaveDealItemsDto, { items: Array(101).fill(item) }), {
    items: "Un negocio admite hasta 100 productos.",
  });
  for (const [field, value, message] of [
    ["quantity", "0", "La cantidad debe ser mayor que cero."],
    ["quantity", "1000000", "La cantidad máxima es 999999.99."],
    ["unitPrice", "-1", "El precio no puede ser negativo."],
    ["unitPrice", "1.001", "Ingresa un precio válido con hasta dos decimales."],
    ["taxRate", "101", "El IVA debe ser un porcentaje entero entre 0 y 100."],
    ["taxRate", "-1", "El IVA debe ser un porcentaje entero entre 0 y 100."],
    ["taxRate", "12.5", "El IVA debe ser un porcentaje entero entre 0 y 100."],
  ]) {
    assert.deepEqual(await errors(SaveDealItemsDto, { items: [{ ...item, [field]: value }] }), { items: message });
  }
});

test("CRM-20: una actividad valida tipo, asunto y fecha", async () => {
  assert.deepEqual(
    await errors(CreateDealActivityDto, { type: "CALL", subject: "Llamar", dueAt: "2026-10-20T15:00:00Z" }),
    {},
  );
  assert.deepEqual(await errors(CreateDealActivityDto, { type: "FAX", subject: "L", dueAt: "luego" }), {
    type: "Elige el tipo de actividad.",
    subject: "Revisa el asunto: entre 2 y 160 caracteres.",
    dueAt: "Ingresa una fecha válida.",
  });
});

test("CRM-18: el listado de negocios acepta filtros opcionales", async () => {
  assert.deepEqual(await errors(ListDealsDto, { page: "1", limit: "20", search: " web " }), {});
  assert.equal(plainToInstance(ListDealsDto, { search: " web " }).search, "web");
});

test("propuesta: vigencia obligatoria y envío opcional; aceptar exige fecha y evidencia", async () => {
  assert.deepEqual(await errors(CreateQuoteDto, {}), { validUntil: "Ingresa la vigencia de la propuesta." });
  assert.deepEqual(await errors(CreateQuoteDto, { validUntil: "2026-11-30", sentAt: "luego" }), {
    sentAt: "Ingresa una fecha de envío válida.",
  });
  assert.ok(plainToInstance(CreateQuoteDto, { validUntil: "2026-11-30" }).validUntil instanceof Date);
  assert.deepEqual(await errors(AcceptQuoteDto, {}), {
    acceptedAt: "Ingresa la fecha de aceptación.",
    acceptanceNote: "Ingresa la evidencia de aceptación.",
  });
  assert.deepEqual(await errors(AcceptQuoteDto, { acceptedAt: "2026-10-02", acceptanceNote: " Orden de compra 55 " }), {});
});

test("una actividad puede registrarse como ya realizada y una etapa elige sus requisitos", async () => {
  assert.deepEqual(await errors(CreateDealActivityDto, { type: "CALL", subject: "Llamada", completedAt: "2026-10-01" }), {});
  assert.deepEqual(await errors(CreateDealActivityDto, { type: "CALL", subject: "Llamada", completedAt: "ayer" }), {
    completedAt: "Ingresa una fecha válida.",
  });
  const stage = { name: "Negociación", position: 2, probability: 45 };
  assert.deepEqual(await errors(CreateStageDto, { ...stage, requirements: ["NEED", "BUDGET"] }), {});
  for (const requirements of [["NEED", "NEED"], ["FAX"], "NEED"])
    assert.deepEqual(await errors(CreateStageDto, { ...stage, requirements }), {
      requirements: "Elige requisitos válidos y sin repetir.",
    });
});

test("el tablero acepta columna y página; la columna exige el pipeline", async () => {
  assert.deepEqual(await errors(BoardQueryDto, {}), {});
  assert.deepEqual(await errors(BoardQueryDto, { pipelineId: "p1", column: "LOST", page: "2" }), {});
  assert.equal(plainToInstance(BoardQueryDto, { page: "2" }).page, 2);
  assert.deepEqual(await errors(BoardQueryDto, { column: "LOST" }), { pipelineId: "Ingresa el pipeline." });
  assert.deepEqual(await errors(BoardQueryDto, { pipelineId: "p1", column: "s1", page: "0" }), {
    page: "La página debe ser un número entero mayor que 0.",
  });
});

test("Sanitización: los textos pierden controles e invisibles y el motivo conserva sus líneas", async () => {
  const body = {
    ...deal,
    title: "  Web\u0000 \u200Bcorporativa\u202E  ",
    need: "Línea uno\r\n\r\n\r\n\r\nLínea\u00A0dos\u0007 ",
  };
  assert.deepEqual(await errors(CreateDealDto, body), {});
  const dto = plainToInstance(CreateDealDto, body);
  assert.equal(dto.title, "Web corporativa");
  assert.equal(dto.need, "Línea uno\n\nLínea dos");
  // Solo invisibles equivale a vacío: no pasa el largo mínimo.
  assert.deepEqual(await errors(ReopenDealDto, { reason: "\u200B\u0000 \u200B" }), {
    reason: "Revisa el motivo: entre 2 y 500 caracteres.",
  });
  assert.equal(plainToInstance(ReopenDealDto, { reason: "Volvió\r\nel cliente" }).reason, "Volvió\nel cliente");
});

test("Sanitización: solo un decimal en cifras pasa a número", async () => {
  for (const value of ["1e3", "0x10", "Infinity", "1_000", "١٢٣", "1,5"]) {
    assert.equal(plainToInstance(CreateDealDto, { ...deal, value }).value, value);
    assert.equal((await errors(CreateDealDto, { ...deal, value })).value, "Ingresa un monto valido con hasta dos decimales.");
  }
  assert.equal(plainToInstance(CreateDealDto, { ...deal, value: " 15.5 " }).value, 15.5);
});
