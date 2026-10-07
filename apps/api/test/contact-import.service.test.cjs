const { test } = require("node:test");
const assert = require("node:assert/strict");
const { BadRequestException, ConflictException, UnprocessableEntityException } = require("@nestjs/common");
const { Prisma } = require("@wave/database");
const { ContactImportService } = require("../dist/modules/contact-import/contact-import.service.js");
const { MAX_IMPORT_ROWS } = require("../dist/common/csv-import.js");

const HEADER = "Nombre;Apellido;Tipo;Documento;Teléfono;Provincia;Etiquetas;RUC empresa";
const MAPPING = JSON.stringify({
  firstName: "Nombre",
  lastName: "Apellido",
  documentType: "Tipo",
  documentId: "Documento",
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
    csv(
      "  María ;Cordero;Cédula;171234567-5;099 123 4567;pichincha;Cliente, VIP;1791234561001",
      "Luis;Mora;pasaporte;ab-123 456;+57 300 123 4567;;;",
      ";;;;;;;",
    ),
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
      documentType: "CEDULA",
      phone: "+593991234567",
      province: "Pichincha",
      tags: ["cliente", "vip"],
      companyId: "company-1",
      ownerId: "user-1",
    },
    {
      firstName: "Luis",
      lastName: "Mora",
      documentId: "AB123456",
      documentType: "PASAPORTE",
      phone: "+573001234567",
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
    importer.importCsv(
      csv("Ana;López;Cédula;1712345678;0991234567;Quito;;", "Luis;Mora;Cédula;1712345675;;;;", "L;;;;12;;;"),
      MAPPING,
      "user-1",
    ),
  );
  assert.ok(error instanceof UnprocessableEntityException);
  assert.deepEqual(error.getResponse(), {
    message: "No se importó ningún contacto: 3 filas tienen errores.",
    errors: [
      { row: 2, column: "Documento", message: "La cédula no es válida." },
      { row: 2, column: "Provincia", message: "Elige una provincia de Ecuador." },
      { row: 3, column: "Teléfono", message: "Ingresa un teléfono o un correo." },
      { row: 4, column: "Nombre", message: "El nombre debe tener entre 2 y 100 caracteres." },
      { row: 4, column: "Apellido", message: "Ingresa el apellido." },
      { row: 4, column: "Tipo", message: "Elige el tipo de documento." },
      { row: 4, column: "Documento", message: "Ingresa el número de documento." },
      { row: 4, column: "Teléfono", message: "Escribe un teléfono válido, por ejemplo 0991234567 o +57 601 234 5678." },
    ],
  });
  assert.equal(created.length, 0);
});

test("reporta documentos repetidos en el archivo, ya registrados y empresas inexistentes", async () => {
  const { importer } = service({ existing: ["AB123456"] });
  const error = await rejection(
    importer.importCsv(
      csv(
        "Ana;López;Cédula;1712345675;0991234567;;;",
        "Eva;Ruiz;Cédula;171234567-5;0991234568;;;",
        "Luis;Mora;Pasaporte;AB123456;0991234569;;;1791234561001",
      ),
      MAPPING,
      "user-1",
    ),
  );
  assert.deepEqual(error.getResponse(), {
    message: "No se importó ningún contacto: 2 filas tienen errores.",
    errors: [
      { row: 3, column: "Documento", message: "El documento se repite en la fila 2." },
      { row: 4, column: "Documento", message: "Ya existe un contacto con ese documento." },
      { row: 4, column: "RUC empresa", message: "No existe una empresa con ese RUC." },
    ],
  });
});

test("una sola fila con errores se anuncia en singular", async () => {
  const { importer } = service();
  const error = await rejection(importer.importCsv(csv("Ana;;;;;;;"), MAPPING, "user-1"));
  assert.equal(error.getResponse().message, "No se importó ningún contacto: 1 fila tiene errores.");
});

test("rechaza archivo o mapeo inválidos con un mensaje claro", async () => {
  const { importer } = service();
  const row = "Ana;López;Cédula;1712345675;;;;";
  const many = Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => row);
  for (const [file, mapping, message] of [
    [undefined, MAPPING, "Adjunta un archivo CSV."],
    [{ ...csv(row), originalname: "contactos.xlsx" }, MAPPING, "El archivo debe ser .csv."],
    [csv('"Ana;López;;;;;;'), MAPPING, "El archivo CSV no tiene un formato válido."],
    [csv(), MAPPING, "El archivo no tiene filas para importar."],
    [csv(";;;;;;;", ""), MAPPING, "El archivo no tiene filas para importar."],
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
    [
      csv(row),
      JSON.stringify({ firstName: "Nombre", lastName: "Apellido" }),
      "Asigna la columna del tipo de documento.",
    ],
    [
      csv(row),
      JSON.stringify({ firstName: "Nombre", lastName: "Apellido", documentType: "Tipo" }),
      "Asigna la columna del número de documento.",
    ],
    [
      csv(row),
      JSON.stringify({ firstName: "Nombre", lastName: "Apellido", documentType: "Tipo", documentId: "Documento" }),
      "Asigna la columna del teléfono o la del correo.",
    ],
  ]) {
    const error = await rejection(importer.importCsv(file, mapping, "user-1"));
    assert.ok(error instanceof BadRequestException, message);
    assert.equal(error.message, message);
  }
});

test("si otra persona registra uno de los documentos a la vez responde 409", async () => {
  const { importer } = service({
    createMany: async () => {
      throw new Prisma.PrismaClientKnownRequestError("duplicado", { code: "P2002", clientVersion: "6" });
    },
  });
  const error = await rejection(importer.importCsv(csv("Ana;López;Cédula;1712345675;0991234567;;;"), MAPPING, "user-1"));
  assert.ok(error instanceof ConflictException);
  assert.equal(error.message, "Otra persona registró uno de estos documentos mientras importabas. Vuelve a subir el archivo.");
});

test("cada contacto trae al menos un teléfono o un correo; con solo el correo, el error va en esa columna", async () => {
  const header = "Nombre;Apellido;Tipo;Documento;Correo";
  const file = (line) => ({ originalname: "contactos.csv", buffer: Buffer.from(`${header}\r\n${line}`, "utf8") });
  const mapping = JSON.stringify({
    firstName: "Nombre",
    lastName: "Apellido",
    documentType: "Tipo",
    documentId: "Documento",
    email: "Correo",
  });
  const { importer } = service();
  assert.deepEqual(await importer.importCsv(file("Ana;López;Cédula;1712345675;ana@empresa.ec"), mapping, "user-1"), {
    imported: 1,
  });
  const error = await rejection(importer.importCsv(file("Ana;López;Cédula;1712345675;"), mapping, "user-1"));
  assert.deepEqual(error.getResponse().errors, [{ row: 2, column: "Correo", message: "Ingresa un teléfono o un correo." }]);
});
