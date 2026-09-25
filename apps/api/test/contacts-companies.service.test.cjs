const { test } = require("node:test");
const assert = require("node:assert/strict");
const { ConflictException, NotFoundException } = require("@nestjs/common");
const { Prisma } = require("@wave/database");
const {
  ContactsService,
} = require("../dist/modules/contacts/contacts.service.js");
const {
  CompaniesService,
} = require("../dist/modules/companies/companies.service.js");

const contact = {
  id: "contact-1",
  firstName: "Ana",
  lastName: "López",
  tags: ["cliente"],
};
const company = { id: "company-1", name: "Wave Comercial", tags: ["cliente"] };

function prismaFor(model, row) {
  return {
    [model]: {
      findMany: async () => [row],
      count: async () => 1,
      findUnique: async () => row,
      create: async ({ data }) => ({ ...row, ...data }),
      update: async ({ data }) => ({ ...row, ...data }),
      delete: async () => row,
    },
    $transaction: async (operations) => Promise.all(operations),
  };
}

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

test("CRM-13: empresas busca por nombre, razón social o RUC", async () => {
  const prisma = prismaFor("company", company);
  let args;
  prisma.company.findMany = async (received) => {
    args = received;
    return [company];
  };
  await new CompaniesService(prisma).list({
    page: 1,
    limit: 20,
    search: "179123",
  });
  assert.equal(args.where.OR[0].name.contains, "179123");
  assert.equal(args.where.OR[1].legalName.contains, "179123");
  assert.equal(args.where.OR[2].taxId.contains, "179123");
});

test("CRM-13: el creador queda como responsable por defecto", async () => {
  const contactPrisma = prismaFor("contact", contact);
  const companyPrisma = prismaFor("company", company);
  const createdContact = await new ContactsService(contactPrisma).create(
    { firstName: "Ana", lastName: "López" },
    "user-1",
  );
  const createdCompany = await new CompaniesService(companyPrisma).create(
    { name: "Wave Comercial" },
    "user-1",
  );
  assert.equal(createdContact.ownerId, "user-1");
  assert.equal(createdCompany.ownerId, "user-1");
});

test("CRM-13: traduce cédula y RUC duplicados a 409", async () => {
  const duplicate = () => {
    throw new Prisma.PrismaClientKnownRequestError("duplicado", {
      code: "P2002",
      clientVersion: "6",
    });
  };
  const contactPrisma = prismaFor("contact", contact);
  const companyPrisma = prismaFor("company", company);
  contactPrisma.contact.create = duplicate;
  companyPrisma.company.create = duplicate;

  await assert.rejects(
    new ContactsService(contactPrisma).create(
      { firstName: "Ana", lastName: "López" },
      "user-1",
    ),
    (error) =>
      error instanceof ConflictException &&
      error.message === "Ya existe un contacto con esa cédula.",
  );
  await assert.rejects(
    new CompaniesService(companyPrisma).create(
      { name: "Wave Comercial" },
      "user-1",
    ),
    (error) =>
      error instanceof ConflictException &&
      error.message === "Ya existe una empresa con ese RUC.",
  );
});

test("CRM-13: consultar, editar o borrar un recurso inexistente responde 404", async () => {
  const contactPrisma = prismaFor("contact", null);
  const companyPrisma = prismaFor("company", null);
  const contacts = new ContactsService(contactPrisma);
  const companies = new CompaniesService(companyPrisma);

  await assert.rejects(contacts.findOne("missing"), NotFoundException);
  await assert.rejects(
    contacts.update("missing", { city: "Quito" }),
    NotFoundException,
  );
  await assert.rejects(companies.remove("missing"), NotFoundException);
});
