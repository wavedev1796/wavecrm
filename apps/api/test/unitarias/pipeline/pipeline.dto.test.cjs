const { test } = require("node:test");
const assert = require("node:assert/strict");
const { plainToInstance } = require("class-transformer");
const { validate } = require("class-validator");
const {
  CreateDealActivityDto,
  CreateDealDto,
  CreatePipelineDto,
  CreateStageDto,
  ListDealsDto,
  LoseDealDto,
  MoveDealDto,
  SaveDealItemsDto,
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

test("CRM-21: ganar admite fecha opcional y perder exige motivo y detalle si es OTHER", async () => {
  assert.deepEqual(await errors(WinDealDto, {}), {});
  assert.ok(plainToInstance(WinDealDto, { closedAt: "2026-10-10T00:00:00.000Z" }).closedAt instanceof Date);
  assert.deepEqual(await errors(WinDealDto, { closedAt: "ayer" }), {
    closedAt: "Ingresa una fecha de ganado válida.",
  });

  assert.deepEqual(await errors(LoseDealDto, {}), { lossReason: "Elige el motivo de la pérdida." });
  assert.deepEqual(await errors(LoseDealDto, { lossReason: "PRICE" }), {});
  assert.deepEqual(await errors(LoseDealDto, { lossReason: "OTHER" }), {
    lossDetail: "Ingresa el detalle del motivo.",
  });
  assert.deepEqual(await errors(LoseDealDto, { lossReason: "PRICE", lossDetail: "x" }), {
    lossDetail: "Revisa el detalle del motivo: entre 2 y 500 caracteres.",
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
