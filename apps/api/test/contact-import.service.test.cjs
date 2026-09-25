const { test } = require("node:test");
const assert = require("node:assert/strict");
const { BadRequestException, ConflictException, UnprocessableEntityException } = require("@nestjs/common");
const { Prisma } = require("@wave/database");
const { ContactImportService, MAX_IMPORT_ROWS } = require("../dist/modules/contact-import/contact-import.service.js");

const HEADER = "Nombre;Apellido;Cédula;Teléfono;Provincia;Etiquetas;RUC empresa";
const MAPPING = JSON.stringify({
  firstName: "Nombre",
  lastName: "Apellido",
  documentId: "Cédula",
  phone: "Teléfono",
  province: "Provincia",
  tags: "Etiquetas",
  companyTaxId: "RUC empresa",
});
const csv = (...lines) => ({ originalname: "contactos.csv", buffer: Buffer.from([HEADER, ...lines].join("\r\n"), "utf8") });

function service({ existing = [], companies = [], createMany } = {}) {
  const created = [];
  const prisma = {
    contact: {
      findMany: async () => existing.map((documentId) => ({ documentId })),
      createMany:
        createMany ??
        (async ({ data }) => {
          created.push(...data);
          return { count: data.length };
        }),
    },
    company: { findMany: async () => companies },
  };
  return { importer: new ContactImportService(prisma), created };
}

async function rejection(promise) {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  assert.fail("La importación debía fallar.");
}

test("importa filas normalizadas, enlazadas a su empresa y con quien importa como responsable", async () => {
  const { importer, created } = service({ companies: [{ id: "company-1", taxId: "1791234561001" }] });
  const result = await importer.importCsv(
    csv("  María ;Cordero;171234567-5;099 123 4567;pichincha;Cliente, VIP;1791234561001", "Luis;Mora;;;;;", ";;;;;;"),
    MAPPING,
    "user-1",
  );
  assert.deepEqual(result, { imported: 2 });
  // JSON quita los campos no mapeados (undefined), que Prisma tampoco envía.
  assert.deepEqual(JSON.parse(JSON.stringify(created)), [
    {
      firstName: "María",
      lastName: "Cordero",
      documentId: "1712345675",
      phone: "+593991234567",
      province: "Pichincha",
      tags: ["cliente", "vip"],
      companyId: "company-1",
      ownerId: "user-1",
    },
    {
      firstName: "Luis",
      lastName: "Mora",
      documentId: null,
      phone: null,
      province: null,
      tags: [],
      companyId: null,
      ownerId: "user-1",
    },
  ]);
});

test("con filas inválidas no guarda ninguna y reporta fila, columna y motivo en orden", async () => {
  const { importer, created } = service();
  const error = await rejection(
    importer.importCsv(csv("Ana;López;1712345678;0991234567;Quito;;", "Luis;Mora;1712345675;;;;", "L;;;12;;;"), MAPPING, "user-1"),
  );
  assert.ok(error instanceof UnprocessableEntityException);
  assert.deepEqual(error.getResponse(), {
    message: "No se importó ningún contacto: 2 filas tienen errores.",
    errors: [
      { row: 2, column: "Cédula", message: "La cédula no es válida." },
      { row: 2, column: "Provincia", message: "Elige una provincia de Ecuador." },
      { row: 4, column: "Nombre", message: "El nombre debe tener entre 2 y 100 caracteres." },
      { row: 4, column: "Apellido", message: "Ingresa el apellido." },
      { row: 4, column: "Teléfono", message: "Escribe un teléfono de Ecuador, por ejemplo 0991234567 o 022345678." },
    ],
  });
  assert.equal(created.length, 0);
});

test("reporta cédulas repetidas en el archivo, ya registradas y empresas inexistentes", async () => {
  const { importer } = service({ existing: ["0102030400"] });
  const error = await rejection(
    importer.importCsv(
      csv("Ana;López;1712345675;;;;", "Eva;Ruiz;171234567-5;;;;", "Luis;Mora;0102030400;;;;1791234561001"),
      MAPPING,
      "user-1",
    ),
  );
  assert.deepEqual(error.getResponse(), {
    message: "No se importó ningún contacto: 2 filas tienen errores.",
    errors: [
      { row: 3, column: "Cédula", message: "La cédula se repite en la fila 2." },
      { row: 4, column: "Cédula", message: "Ya existe un contacto con esa cédula." },
      { row: 4, column: "RUC empresa", message: "No existe una empresa con ese RUC." },
    ],
  });
});

test("una sola fila con errores se anuncia en singular", async () => {
  const { importer } = service();
  const error = await rejection(importer.importCsv(csv("Ana;;;;;;"), MAPPING, "user-1"));
  assert.equal(error.getResponse().message, "No se importó ningún contacto: 1 fila tiene errores.");
});

test("rechaza archivo o mapeo inválidos con un mensaje claro", async () => {
  const { importer } = service();
  const row = "Ana;López;;;;;";
  const many = Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => row);
  for (const [file, mapping, message] of [
    [undefined, MAPPING, "Adjunta un archivo CSV."],
    [{ ...csv(row), originalname: "contactos.xlsx" }, MAPPING, "El archivo debe ser .csv."],
    [csv('"Ana;López;;;;;'), MAPPING, "El archivo CSV no tiene un formato válido."],
    [csv(), MAPPING, "El archivo no tiene filas para importar."],
    [csv(";;;;;;", ""), MAPPING, "El archivo no tiene filas para importar."],
    [csv(...many), MAPPING, "El archivo supera las 1000 filas. Divídelo en partes más pequeñas."],
    [csv(row), undefined, "El mapeo de columnas no tiene un formato válido."],
    [csv(row), "[]", "El mapeo de columnas no tiene un formato válido."],
    [csv(row), JSON.stringify({ firstName: "Nombre", lastName: 7 }), "El mapeo de columnas no tiene un formato válido."],
    [
      csv(row),
      JSON.stringify({ firstName: "Nombre", lastName: "Apellido", ownerId: "Nombre" }),
      "El campo «ownerId» no se puede importar.",
    ],
    [csv(row), JSON.stringify({ firstName: "Nombre", lastName: "Apellidos" }), "La columna «Apellidos» no está en el archivo."],
    [csv(row), JSON.stringify({ firstName: "Nombre" }), "Asigna la columna del apellido."],
    [csv(row), JSON.stringify({ lastName: "Apellido" }), "Asigna la columna del nombre."],
  ]) {
    const error = await rejection(importer.importCsv(file, mapping, "user-1"));
    assert.ok(error instanceof BadRequestException, message);
    assert.equal(error.message, message);
  }
});

test("si otra persona registra una cédula a la vez responde 409", async () => {
  const { importer } = service({
    createMany: async () => {
      throw new Prisma.PrismaClientKnownRequestError("duplicado", { code: "P2002", clientVersion: "6" });
    },
  });
  const error = await rejection(importer.importCsv(csv("Ana;López;1712345675;;;;"), MAPPING, "user-1"));
  assert.ok(error instanceof ConflictException);
  assert.equal(error.message, "Otra persona registró una de estas cédulas mientras importabas. Vuelve a subir el archivo.");
});
