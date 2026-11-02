// CRM-25: línea de tiempo por negocio y por contacto (orden, cursor, alcance por responsable).
const { test } = require("node:test");
const assert = require("node:assert/strict");
const { BadRequestException, NotFoundException } = require("@nestjs/common");
const {
  TimelineService,
} = require("../../../dist/modules/timeline/timeline.service.js");
const {
  TimelineController,
} = require("../../../dist/modules/timeline/timeline.controller.js");

const admin = { id: "a1", role: "ADMIN" };
const vera = { id: "u1", role: "VENDEDOR" };
const ana = { id: "u1", name: "Vera" };
const otro = { id: "u2", name: "Otro" };
const T = new Date("2026-11-01T15:00:00.000Z");
const before = new Date("2026-11-01T14:00:00.000Z");

/** Evalúa el subconjunto de filtros Prisma que usa el servicio (AND, OR, in, lt, lte, null, relación y ruta JSON). */
function matches(row, where) {
  return Object.entries(where).every(([key, cond]) => {
    if (key === "AND") return cond.every((w) => matches(row, w));
    if (key === "OR") return cond.some((w) => matches(row, w));
    const value = row[key];
    if (cond === null) return value == null;
    if (cond instanceof Date) return value.getTime() === cond.getTime();
    if (typeof cond !== "object") return value === cond;
    if ("path" in cond) return value?.[cond.path[0]] === cond.equals;
    if ("in" in cond) return cond.in.includes(value);
    if ("lt" in cond) return value < cond.lt;
    if ("lte" in cond) return value <= cond.lte;
    return value != null && matches(value, cond);
  });
}

function db() {
  const deals = [
    { id: "d1", title: "Mío", contactId: "c1", ownerId: "u1" },
    { id: "d2", title: "Ajeno", contactId: "c1", ownerId: "u2" },
    { id: "d3", title: "Sin responsable", contactId: null, ownerId: null },
  ];
  const deal = (id) => deals.find((d) => d.id === id) ?? null;
  const rows = {
    contact: [
      { id: "c1", ownerId: "u1" },
      { id: "c2", ownerId: null },
      { id: "c3", ownerId: "u2" },
    ],
    activity: [
      { id: "act1", dealId: "d1", contactId: "c1", createdAt: T, createdBy: ana, assignee: otro },
      { id: "act2", dealId: "d1", contactId: "c1", createdAt: T, createdBy: null, assignee: otro },
      { id: "act3", dealId: "d2", contactId: "c1", createdAt: T, createdBy: otro, assignee: otro },
      { id: "act4", dealId: null, contactId: "c1", createdAt: before, createdBy: ana, assignee: ana },
    ].map((a) => ({
      type: "CALL",
      status: "PENDING",
      subject: "Llamar " + a.id,
      description: null,
      dueAt: null,
      completedAt: null,
      ...a,
      deal: deal(a.dealId),
    })),
    note: [
      { id: "n1", dealId: "d1", contactId: null, content: "Nota", createdAt: T, author: ana, deal: deal("d1") },
    ],
    dealStageHistory: [
      { id: "st1", dealId: "d1", changedAt: T, fromStage: null, toStage: { id: "s1", name: "Nuevo" }, changedBy: ana, reason: null, deal: deal("d1") },
      { id: "st2", dealId: "d2", changedAt: T, fromStage: null, toStage: { id: "s1", name: "Nuevo" }, changedBy: otro, reason: null, deal: deal("d2") },
    ],
    auditLog: [
      { id: "ev1", entityType: "Deal", entityId: "d1", action: "WON", changes: { closedAt: "x" }, createdAt: T, user: ana },
      { id: "ev2", entityType: "Deal", entityId: "d2", action: "LOST", changes: null, createdAt: T, user: otro },
      { id: "ev3", entityType: "Deal", entityId: "dx", action: "DELETED", changes: { contactId: "c1", ownerId: "u1", title: "Borrado mío" }, createdAt: before, user: ana },
      { id: "ev4", entityType: "Deal", entityId: "dy", action: "DELETED", changes: { contactId: "c1", title: "Viejo" }, createdAt: before, user: null },
      { id: "ev5", entityType: "Deal", entityId: "dz", action: "DELETED", changes: { contactId: "c1", ownerId: "u2", title: "De otro" }, createdAt: before, user: otro },
    ],
  };
  const ref = ({ id, title }) => ({ id, title });
  const project = (r) => (r.deal ? { ...r, deal: { id: r.deal.id, title: r.deal.title } } : r);
  const findMany = (list) => async ({ where, orderBy, take }) => {
    const field = orderBy ? Object.keys(orderBy[0])[0] : "id";
    return list()
      .filter((r) => matches(r, where))
      .sort((a, b) => b[field] - a[field] || (a.id < b.id ? 1 : -1))
      .slice(0, take)
      .map(project);
  };
  const prisma = {
    deal: {
      findFirst: async ({ where }) => deals.filter((d) => matches(d, where)).map(ref)[0] ?? null,
      findMany: async ({ where }) => deals.filter((d) => matches(d, where)).map(ref),
    },
    contact: { findFirst: async ({ where }) => rows.contact.find((c) => matches(c, where)) ?? null },
  };
  for (const model of ["activity", "note", "dealStageHistory", "auditLog"])
    prisma[model] = { findMany: findMany(() => rows[model]) };
  return { prisma, rows, service: new TimelineService(prisma) };
}

/** Recorre todas las páginas con `limit` y devuelve los ids en orden. */
async function walk(read, limit, between) {
  const ids = [];
  let cursor;
  do {
    const page = await read({ limit, cursor });
    assert.ok(page.data.length <= limit);
    assert.equal(page.meta.limit, limit);
    ids.push(...page.data.map((e) => e.id));
    cursor = page.meta.nextCursor;
    between?.();
  } while (cursor);
  return ids;
}

test("orden por at y id descendentes; paginar con 1 o 2 no repite ni omite eventos del mismo instante", async () => {
  const { service } = db();
  const all = await service.forDeal("d1", admin, { limit: 50 });
  assert.equal(all.meta.nextCursor, null);
  assert.deepEqual(
    all.data.map((e) => e.id),
    ["STAGE:st1", "NOTE:n1", "EVENT:ev1", "ACTIVITY:act2", "ACTIVITY:act1"],
  );
  for (const e of all.data) {
    assert.ok(e.at instanceof Date);
    assert.ok(e.author?.id && e.author?.name);
    assert.deepEqual(e.deal, { id: "d1", title: "Mío" });
    assert.equal(e.id.split(":")[0], e.kind);
  }
  const expected = all.data.map((e) => e.id);
  for (const limit of [1, 2]) assert.deepEqual(await walk((q) => service.forDeal("d1", admin, q), limit), expected);
});

test("una fila nueva entre páginas no desplaza las siguientes", async () => {
  const { service, rows } = db();
  const expected = (await service.forDeal("d1", admin, { limit: 50 })).data.map((e) => e.id);
  let added = false;
  const ids = await walk((q) => service.forDeal("d1", admin, q), 2, () => {
    if (added) return;
    added = true;
    rows.activity.push({ ...rows.activity[0], id: "act9", createdAt: new Date("2026-11-02T00:00:00Z") });
  });
  assert.deepEqual(ids, expected);
});

test("el autor de una actividad es quien la registró o, en las antiguas, su responsable", async () => {
  const { service } = db();
  const { data } = await service.forDeal("d1", vera, { limit: 20 });
  const byId = Object.fromEntries(data.map((e) => [e.id, e]));
  assert.deepEqual(byId["ACTIVITY:act1"].author, ana);
  assert.deepEqual(byId["ACTIVITY:act2"].author, otro);
  assert.deepEqual(byId["ACTIVITY:act2"].activity, {
    id: "act2",
    type: "CALL",
    status: "PENDING",
    subject: "Llamar act2",
    description: null,
    dueAt: null,
    completedAt: null,
    assignee: otro,
  });
  assert.deepEqual(byId["NOTE:n1"].note, { id: "n1", content: "Nota" });
  assert.deepEqual(byId["STAGE:st1"].stage, { from: null, to: { id: "s1", name: "Nuevo" }, reason: null });
  assert.deepEqual(byId["EVENT:ev1"].event, { action: "WON", changes: { closedAt: "x" } });
});

test("VENDEDOR recibe 404 en negocios y contactos ajenos o sin responsable; ADMIN los ve", async () => {
  const { service } = db();
  await assert.rejects(service.forDeal("d2", vera, { limit: 20 }), NotFoundException);
  await assert.rejects(service.forDeal("d3", vera, { limit: 20 }), NotFoundException);
  await assert.rejects(service.forDeal("nada", admin, { limit: 20 }), /Negocio no encontrado/);
  await assert.rejects(service.forContact("c3", vera, { limit: 20 }), NotFoundException);
  await assert.rejects(service.forContact("c2", vera, { limit: 20 }), /Contacto no encontrado/);
  assert.deepEqual((await service.forDeal("d3", admin, { limit: 20 })).data, []);
  assert.deepEqual((await service.forContact("c2", admin, { limit: 20 })).data, []);
});

test("contacto: VENDEDOR solo ve lo suyo y los borrados que eran suyos; ADMIN ve todo", async () => {
  const { service } = db();
  const mine = await service.forContact("c1", vera, { limit: 50 });
  assert.deepEqual(
    mine.data.map((e) => e.id),
    ["STAGE:st1", "NOTE:n1", "EVENT:ev1", "ACTIVITY:act2", "ACTIVITY:act1", "EVENT:ev3", "ACTIVITY:act4"],
  );
  const byId = Object.fromEntries(mine.data.map((e) => [e.id, e]));
  assert.equal(byId["ACTIVITY:act4"].deal, null);
  assert.equal(byId["EVENT:ev3"].deal, null);
  assert.equal(byId["EVENT:ev3"].event.changes.title, "Borrado mío");

  const all = await service.forContact("c1", admin, { limit: 50 });
  const ids = all.data.map((e) => e.id);
  for (const id of ["ACTIVITY:act3", "STAGE:st2", "EVENT:ev2", "EVENT:ev4", "EVENT:ev5"]) assert.ok(ids.includes(id), id);
  assert.equal(ids.length, 12);
  const old = all.data.find((e) => e.id === "EVENT:ev4");
  assert.deepEqual([old.deal, old.author], [null, null]);
  assert.deepEqual(all.data.find((e) => e.id === "EVENT:ev2").deal, { id: "d2", title: "Ajeno" });
  assert.deepEqual(await walk((q) => service.forContact("c1", admin, q), 2), ids);
});

test("un cursor mal formado responde 400; vacío es la primera página", async () => {
  const { service } = db();
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  for (const cursor of [
    "nope",
    encode(null),
    encode({}),
    encode({ at: "x", id: "ACTIVITY:act1" }),
    encode({ at: T.toISOString(), id: "FOO:act1" }),
    encode({ at: T.toISOString(), id: "ACTIVITY:" }),
    encode({ at: T.toISOString(), id: 5 }),
  ])
    await assert.rejects(service.forDeal("d1", admin, { limit: 20, cursor }), (error) => {
      assert.ok(error instanceof BadRequestException);
      assert.equal(error.message, "El cursor no es válido.");
      return true;
    });
  assert.equal((await service.forDeal("d1", admin, { limit: 20, cursor: "" })).data.length, 5);
});

test("el controlador pasa id, consulta y usuario del token", async () => {
  const calls = [];
  const c = new TimelineController({
    forDeal: (...args) => calls.push(["deal", ...args]),
    forContact: (...args) => calls.push(["contact", ...args]),
  });
  const user = { sub: "u1", role: "VENDEDOR" };
  c.deal("d1", { limit: 5 }, user);
  c.contact("c1", { limit: 5 }, user);
  assert.deepEqual(calls, [
    ["deal", "d1", vera, { limit: 5 }],
    ["contact", "c1", vera, { limit: 5 }],
  ]);
});

test("la consulta acepta cursor y un límite de 1 a 50, 20 por defecto", async () => {
  const { plainToInstance } = require("class-transformer");
  const { validate } = require("class-validator");
  const { TimelineQueryDto } = require("../../../dist/modules/timeline/timeline.dto.js");
  const check = async (query) => {
    const dto = plainToInstance(TimelineQueryDto, query);
    return [dto, (await validate(dto)).flatMap((e) => Object.values(e.constraints))];
  };
  const [dto, none] = await check({});
  assert.deepEqual([dto.limit, none], [20, []]);
  assert.deepEqual((await check({ limit: "50", cursor: "abc" }))[1], []);
  for (const limit of ["0", "51", "1.5"])
    assert.ok((await check({ limit }))[1].includes("El límite debe ser un número entero entre 1 y 50."));
  assert.deepEqual((await check({ cursor: ["a", "b"] }))[1], ["El cursor no es válido."]);
});
