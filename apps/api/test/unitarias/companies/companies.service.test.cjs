const { test } = require("node:test");
const assert = require("node:assert/strict");
const { ConflictException, NotFoundException } = require("@nestjs/common");
const { Prisma } = require("@wave/database");
const {
  CompaniesService,
} = require("../../../dist/modules/companies/companies.service.js");
const { prismaFor } = require("../prisma-falso.cjs");

const company = { id: "company-1", name: "Wave Comercial", tags: ["cliente"] };

const prismaError = (code) =>
  new Prisma.PrismaClientKnownRequestError(code, { code, clientVersion: "6" });

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

test("el listado de empresas filtra por provincia, etiqueta y responsable", async () => {
  const prisma = prismaFor("company", company);
  let args;
  prisma.company.findMany = async (received) => {
    args = received;
    return [company];
  };
  const result = await new CompaniesService(prisma).list({
    page: 3,
    limit: 5,
    province: "Guayas",
    tag: "cliente",
    ownerId: "user-1",
  });

  assert.deepEqual(args.where, {
    province: "Guayas",
    tags: { has: "cliente" },
    ownerId: "user-1",
  });
  assert.equal(args.skip, 10);
  assert.deepEqual(result.meta, { page: 3, limit: 5, total: 1, totalPages: 1 });
});

test("CRM-13: el creador queda como responsable de la empresa por defecto, salvo que se indique otro", async () => {
  const companies = () => new CompaniesService(prismaFor("company", company));
  const byDefault = await companies().create({ name: "Wave Comercial" }, "user-1");
  const explicit = await companies().create(
    { name: "Wave Comercial", ownerId: null },
    "user-1",
  );
  assert.equal(byDefault.ownerId, "user-1");
  assert.equal(explicit.ownerId, null);
});

test("CRM-13: traduce el RUC duplicado a 409 y el responsable inexistente a 404", async () => {
  const failWith = (error) => {
    const prisma = prismaFor("company", company);
    prisma.company.create = async () => {
      throw error;
    };
    prisma.company.update = prisma.company.create;
    return new CompaniesService(prisma);
  };

  await assert.rejects(
    failWith(prismaError("P2002")).create({ name: "Wave Comercial" }, "user-1"),
    (error) =>
      error instanceof ConflictException &&
      error.message === "Ya existe una empresa con ese RUC.",
  );
  await assert.rejects(
    failWith(prismaError("P2003")).update("company-1", { ownerId: "x" }, "user-1"),
    (error) =>
      error instanceof NotFoundException &&
      error.message === "El responsable indicado no existe.",
  );
  await assert.rejects(
    failWith(new Error("caída")).update("company-1", { name: "X" }, "user-1"),
    /caída/,
  );
});

test("CRM-13: consultar, editar o borrar una empresa inexistente responde 404", async () => {
  const companies = new CompaniesService(prismaFor("company", null));

  await assert.rejects(companies.findOne("missing"), NotFoundException);
  await assert.rejects(companies.update("missing", { name: "X" }, "user-1"), NotFoundException);
  await assert.rejects(companies.remove("missing"), NotFoundException);
});

test("borrar una empresa existente la elimina por id", async () => {
  const prisma = prismaFor("company", company);
  let deleted;
  prisma.company.delete = async (args) => {
    deleted = args;
    return company;
  };
  await new CompaniesService(prisma).remove("company-1");
  assert.deepEqual(deleted, { where: { id: "company-1" } });
});

test("la ficha de empresa incluye contactos negocios e historial", async () => {
  const prisma = prismaFor("company", company);
  prisma.auditLog.findMany = async () => [
    { id: "log-1", action: "CREATE", user: { id: "user-1", name: "Ana" } },
  ];
  let companyQuery;
  prisma.company.findUnique = async (args) => {
    companyQuery = args;
    return { ...company, contacts: [], deals: [] };
  };

  const result = await new CompaniesService(prisma).findOne("company-1");

  assert.ok(companyQuery.include.contacts);
  assert.ok(companyQuery.include.deals);
  assert.equal(result.history[0].action, "CREATE");
});

test("editar una empresa registra los campos cambiados", async () => {
  const prisma = prismaFor("company", company);
  let audit;
  prisma.auditLog.create = async ({ data }) => {
    audit = data;
    return data;
  };

  await new CompaniesService(prisma).update(
    "company-1",
    { name: "Wave Ecuador", city: "Quito" },
    "user-1",
  );

  assert.equal(audit.action, "UPDATE");
  assert.equal(audit.entityId, "company-1");
  assert.equal(audit.userId, "user-1");
  assert.deepEqual(audit.changes.fields, ["name", "city"]);
});
