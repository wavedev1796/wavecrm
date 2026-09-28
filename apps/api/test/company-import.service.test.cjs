const { test } = require("node:test");
const assert = require("node:assert/strict");
const { BadRequestException, ConflictException, UnprocessableEntityException } = require("@nestjs/common");
const { Prisma } = require("@wave/database");
const { CompanyImportService } = require("../dist/modules/company-import/company-import.service.js");

const HEADER = "Nombre;Razón social;RUC;Teléfono;Provincia;Etiquetas";
const MAPPING = JSON.stringify({
  name: "Nombre",
  legalName: "Razón social",
  taxId: "RUC",
  phone: "Teléfono",
  province: "Provincia",
  tags: "Etiquetas",
});
const csv = (...lines) => ({ originalname: "empresas.csv", buffer: Buffer.from([HEADER, ...lines].join("\r\n"), "utf8") });

function service({ existing = [], createMany } = {}) {
  const created = [];
  const prisma = {
    company: {
      findMany: async () => existing.map((taxId) => ({ taxId })),
      createMany:
        createMany ??
        (async ({ data }) => {
          created.push(...data);
          return { count: data.length };
        }),
    },
  };
  return { importer: new CompanyImportService(prisma), created };
}

async function rejection(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  assert.fail("La importación debía fallar.");
}

test("importa empresas normalizadas con quien importa como responsable", async () => {
  const { importer, created } = service();
  const result = await importer.importCsv(
    csv(" Wave  Comercial ;Wave Comercial S.A.;179 1234561 001;+57 601 234 5678;pichincha;Cliente, VIP"),
    MAPPING,
    "user-1",
  );
  assert.deepEqual(result, { imported: 1 });
  // JSON quita los campos no mapeados (undefined), que Prisma tampoco envía.
  assert.deepEqual(JSON.parse(JSON.stringify(created)), [
    {
      name: "Wave Comercial",
      legalName: "Wave Comercial S.A.",
      taxId: "1791234561001",
      phone: "+576012345678",
      province: "Pichincha",
      tags: ["cliente", "vip"],
      ownerId: "user-1",
    },
  ]);
});

test("reporta RUC vacío, inválido, repetido en el archivo y ya registrado, sin guardar nada", async () => {
  const { importer, created } = service({ existing: ["1760000070001"] });
  const error = await rejection(
    importer.importCsv(
      csv("Uno;;;;;", "Dos;;1791234562001;;;", "Tres;;1791234561001;;;", "Cuatro;;1791234561001;;;", "Cinco;;1760000070001;;;"),
      MAPPING,
      "user-1",
    ),
  );
  assert.ok(error instanceof UnprocessableEntityException);
  assert.deepEqual(error.getResponse(), {
    message: "No se importó ninguna empresa: 4 filas tienen errores.",
    errors: [
      { row: 2, column: "RUC", message: "Ingresa el RUC." },
      { row: 3, column: "RUC", message: "El RUC no es válido." },
      { row: 5, column: "RUC", message: "El RUC se repite en la fila 4." },
      { row: 6, column: "RUC", message: "Ya existe una empresa con ese RUC." },
    ],
  });
  assert.equal(created.length, 0);
});

test("el mapeo exige nombre y RUC", async () => {
  const { importer } = service();
  for (const [mapping, message] of [
    [{ taxId: "RUC" }, "Asigna la columna del nombre."],
    [{ name: "Nombre" }, "Asigna la columna del RUC."],
  ]) {
    const error = await rejection(importer.importCsv(csv("Uno;;1791234561001;;;"), JSON.stringify(mapping), "user-1"));
    assert.ok(error instanceof BadRequestException);
    assert.equal(error.message, message);
  }
});

test("si otra persona registra un RUC a la vez responde 409; otro fallo de la base no se disfraza", async () => {
  const { importer } = service({
    createMany: async () => {
      throw new Prisma.PrismaClientKnownRequestError("duplicado", { code: "P2002", clientVersion: "6" });
    },
  });
  const error = await rejection(importer.importCsv(csv("Uno;;1791234561001;;;"), MAPPING, "user-1"));
  assert.ok(error instanceof ConflictException);
  assert.equal(error.message, "Otra persona registró uno de estos RUC mientras importabas. Vuelve a subir el archivo.");

  const down = new Error("sin conexión");
  const { importer: offline } = service({
    createMany: async () => {
      throw down;
    },
  });
  assert.equal(await rejection(offline.importCsv(csv("Uno;;1791234561001;;;"), MAPPING, "user-1")), down);
});
