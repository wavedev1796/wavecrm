const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  BadRequestException,
  ConflictException,
  NotFoundException,
} = require("@nestjs/common");
const { Prisma } = require("@wave/database");
const {
  ContactsService,
} = require("../../../dist/modules/contacts/contacts.service.js");
const { prismaFor } = require("../prisma-falso.cjs");

const contact = {
  id: "contact-1",
  firstName: "Ana",
  lastName: "López",
  phone: "+593991234567",
  email: null,
  tags: ["cliente"],
};

test("CRM-13: contactos aplica búsqueda, filtros y paginación", async () => {
  const prisma = prismaFor("contact", contact);
  let args;
  prisma.contact.findMany = async (received) => {
    args = received;
    return [contact];
  };
  const result = await new ContactsService(prisma).list({
    page: 2,
    limit: 10,
    search: "ana",
    province: "Pichincha",
    tag: "cliente",
    ownerId: "user-1",
  });

  assert.equal(args.skip, 10);
  assert.equal(args.take, 10);
  assert.equal(args.where.province, "Pichincha");
  assert.deepEqual(args.where.tags, { has: "cliente" });
  assert.equal(args.where.ownerId, "user-1");
  assert.equal(args.where.AND[0].OR[0].firstName.contains, "ana");
  assert.deepEqual(result.meta, {
    page: 2,
    limit: 10,
    total: 1,
    totalPages: 1,
  });
});

test("CRM-13: el creador queda como responsable del contacto por defecto", async () => {
  const created = await new ContactsService(prismaFor("contact", contact)).create(
    { firstName: "Ana", lastName: "López", phone: "+593991234567" },
    "user-1",
  );
  assert.equal(created.ownerId, "user-1");
});

test("CRM-13: traduce la cédula duplicada a 409", async () => {
  const prisma = prismaFor("contact", contact);
  prisma.contact.create = () => {
    throw new Prisma.PrismaClientKnownRequestError("duplicado", {
      code: "P2002",
      clientVersion: "6",
    });
  };

  await assert.rejects(
    new ContactsService(prisma).create(
      { firstName: "Ana", lastName: "López", email: "ana@empresa.ec" },
      "user-1",
    ),
    (error) =>
      error instanceof ConflictException &&
      error.message === "Ya existe un contacto con ese documento.",
  );
});

test("CRM-13: consultar o editar un contacto inexistente responde 404", async () => {
  const contacts = new ContactsService(prismaFor("contact", null));

  await assert.rejects(contacts.findOne("missing"), NotFoundException);
  await assert.rejects(
    contacts.update("missing", { city: "Quito" }),
    NotFoundException,
  );
});

test("la ficha devuelve el contacto y borrarlo usa su id", async () => {
  const prisma = prismaFor("contact", contact);
  let deleted;
  prisma.contact.delete = async (args) => {
    deleted = args;
    return contact;
  };
  const contacts = new ContactsService(prisma);
  let query;
  const findUnique = prisma.contact.findUnique;
  prisma.contact.findUnique = async (args) => ((query = args), findUnique(args));

  assert.equal((await contacts.findOne("contact-1")).firstName, "Ana");
  const deals = query.include.deals.select;
  assert.deepEqual([deals.closedAt, deals.lossReason, deals.stageHistory.take], [true, true, 1]);
  await contacts.remove("contact-1");
  assert.deepEqual(deleted, { where: { id: "contact-1" } });
});

test("una empresa o responsable inexistente responde 404 y otros errores se propagan", async () => {
  const failWith = (error) => {
    const prisma = prismaFor("contact", contact);
    prisma.contact.update = async () => {
      throw error;
    };
    return new ContactsService(prisma).update("contact-1", { city: "Quito" });
  };

  await assert.rejects(
    failWith(
      new Prisma.PrismaClientKnownRequestError("fk", { code: "P2003", clientVersion: "6" }),
    ),
    (error) =>
      error instanceof NotFoundException &&
      error.message === "La empresa o el responsable indicado no existe.",
  );
  await assert.rejects(failWith(new Error("caída")), /caída/);
});

test("tipo y número de documento cambian juntos en un PATCH", async () => {
  const prisma = prismaFor("contact", contact);
  let data;
  prisma.contact.update = async (args) => {
    data = args.data;
    return contact;
  };
  const document = { documentType: "PASAPORTE", documentId: "AB123456" };
  await new ContactsService(prisma).update("contact-1", document);
  assert.deepEqual(data, document);
});

test("un PATCH con solo el tipo o solo el número de documento se rechaza", async () => {
  for (const [dto, message] of [
    [{ documentType: "RUC" }, "Ingresa el número de documento."],
    [{ documentId: "1712345675" }, "Elige el tipo de documento."],
  ]) {
    await assert.rejects(
      new ContactsService(prismaFor("contact", contact)).update("contact-1", dto),
      (error) => error instanceof BadRequestException && error.message === message,
    );
  }
});

test("un contacto necesita al menos un teléfono o un correo, también al editarlo", async () => {
  const rejected = (promise) =>
    assert.rejects(
      promise,
      (error) =>
        error instanceof BadRequestException &&
        error.message === "Ingresa un teléfono o un correo.",
    );
  const contacts = () => new ContactsService(prismaFor("contact", contact));
  await rejected(
    contacts().create({ firstName: "Ana", lastName: "López", email: null }, "user-1"),
  );
  // El guardado solo tiene teléfono: borrarlo sin dar un correo deja al contacto sin forma de contacto.
  await rejected(contacts().update("contact-1", { phone: null }));
  await contacts().update("contact-1", { phone: null, email: "ana@empresa.ec" });
  await contacts().update("contact-1", { city: "Quito" });
});

test("la búsqueda por documento ignora mayúsculas (pasaportes)", async () => {
  const prisma = prismaFor("contact", contact);
  let args;
  prisma.contact.findMany = async (received) => {
    args = received;
    return [contact];
  };
  await new ContactsService(prisma).list({
    page: 1,
    limit: 10,
    search: "ab123",
  });
  assert.deepEqual(args.where.AND[0].OR[2].documentId, {
    contains: "ab123",
    mode: "insensitive",
  });
});
