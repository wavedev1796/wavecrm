const { test } = require("node:test");
const assert = require("node:assert/strict");
const { plainToInstance } = require("class-transformer");
const { validate } = require("class-validator");
const {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
} = require("@nestjs/common");
const { NotesService } = require("../../../dist/modules/notes/notes.service.js");
const { CreateNoteDto } = require("../../../dist/modules/notes/notes.dto.js");

const ADMIN = { id: "admin", role: "ADMIN" };
const ANA = { id: "ana", role: "VENDEDOR" };
const LUIS = { id: "luis", role: "VENDEDOR" };
const USERS = {
  admin: { id: "admin", name: "Admin", email: "admin@example.test", active: true },
  ana: { id: "ana", name: "Ana", email: "ana@example.test", active: true },
  luis: { id: "luis", name: "Luis", email: "luis@example.test", active: true },
  baja: { id: "baja", name: "Baja", email: "baja@example.test", active: false },
};
const person = (id) => ({ id, name: USERS[id].name });

/** Prisma en memoria con lo que usa NotesService: negocio de Ana, contacto de Luis, notas y menciones. */
function setup({ failMail = false } = {}) {
  const deals = { "deal-ana": { id: "deal-ana", title: "Licencias", ownerId: "ana" } };
  const contacts = { "contact-luis": { id: "contact-luis", firstName: "Eva", lastName: "Paz", ownerId: "luis" } };
  const notes = new Map();
  let mentions = [];
  const audit = [];
  const sent = [];
  let seq = 0;
  const scoped = (rows) => async ({ where }) =>
    rows[where.id] && (!where.ownerId || rows[where.id].ownerId === where.ownerId) ? 1 : 0;
  const full = (note) => ({
    ...note,
    author: person(note.authorId),
    deal: note.dealId ? { ...deals[note.dealId], owner: USERS[deals[note.dealId].ownerId] } : null,
    contact: note.contactId ? { ...contacts[note.contactId], owner: USERS[contacts[note.contactId].ownerId] } : null,
    mentions: mentions
      .filter((m) => m.noteId === note.id)
      .map((m) => ({ ...m, user: { ...person(m.userId), email: USERS[m.userId].email } })),
  });
  const matches = (m, where) =>
    m.noteId === where.noteId &&
    (!where.userId || (typeof where.userId === "string" ? m.userId === where.userId : !where.userId.notIn.includes(m.userId))) &&
    (where.notifiedAt !== null || m.notifiedAt === null);
  const prisma = {
    deal: { count: scoped(deals) },
    contact: { count: scoped(contacts) },
    user: {
      count: async ({ where }) => where.id.in.filter((id) => USERS[id]?.active).length,
    },
    note: {
      create: async ({ data }) => {
        const { mentions: nested, ...row } = data;
        const note = { id: `note-${++seq}`, dealId: null, contactId: null, editedAt: null, createdAt: new Date(), ...row };
        notes.set(note.id, note);
        mentions.push(...nested.create.map(({ userId }) => ({ noteId: note.id, userId, notifiedAt: null })));
        return full(note);
      },
      findUnique: async ({ where }) => (notes.has(where.id) ? full(notes.get(where.id)) : null),
      findUniqueOrThrow: async ({ where }) => {
        const note = full(notes.get(where.id));
        return { ...note, mentions: note.mentions.filter((m) => m.notifiedAt === null && USERS[m.userId].active) };
      },
      update: async ({ where, data }) => (Object.assign(notes.get(where.id), data), full(notes.get(where.id))),
      delete: async ({ where }) => notes.delete(where.id),
    },
    noteMention: {
      updateMany: async ({ where, data }) => {
        const rows = mentions.filter((m) => matches(m, where));
        rows.forEach((m) => Object.assign(m, data));
        return { count: rows.length };
      },
      deleteMany: async ({ where }) => {
        mentions = mentions.filter((m) => !matches(m, { ...where, notifiedAt: undefined }));
      },
      createMany: async ({ data }) => {
        for (const row of data)
          if (!mentions.some((m) => m.noteId === row.noteId && m.userId === row.userId))
            mentions.push({ ...row, notifiedAt: null });
      },
    },
    auditLog: { create: async ({ data }) => (audit.push(data), data) },
  };
  prisma.$transaction = async (operation) =>
    typeof operation === "function" ? operation(prisma) : Promise.all(operation);
  const mailer = {
    sendMention: async (...args) => {
      if (failMail) throw new ServiceUnavailableException("No se pudo enviar el correo.");
      sent.push(args);
    },
    sendNoteToOwner: async (...args) => {
      if (failMail) throw new ServiceUnavailableException("No se pudo enviar el correo.");
      owners.push(args);
    },
  };
  const owners = [];
  return { service: new NotesService(prisma, mailer), notes, audit, sent, owners, mentions: () => mentions };
}

test("P12: una nota nueva avisa una vez al responsable, salvo que la escriba él o ya esté mencionado", async () => {
  const { service, sent, owners } = setup();
  const note = await service.createForDeal("deal-ana", ADMIN, { content: "Llamar al cliente" });
  assert.deepEqual(
    owners.map(([to, author, record, path]) => [to.id, author, record, path]),
    [["ana", "Admin", "negocio «Licencias»", "/pipeline/deal-ana"]],
  );
  assert.ok(!owners.flat().some((part) => typeof part === "string" && part.includes("Llamar")), "sin el texto");
  // Editarla no vuelve a avisar.
  await service.update(note.id, ADMIN, { content: "Llamar el martes" });
  assert.equal(owners.length, 1);
  // Si ya lo mencionan, recibe solo el aviso de la mención.
  await service.createForContact("contact-luis", ADMIN, { content: "x", mentionIds: ["luis"] });
  assert.equal(owners.length, 1);
  assert.deepEqual(sent.map(([to]) => to.id), ["luis"]);
  // Quien escribe en su propio registro no se avisa a sí mismo.
  await service.createForDeal("deal-ana", ANA, { content: "x" });
  assert.equal(owners.length, 1);
  // Si el correo falla, la nota se guarda igual.
  const failing = setup({ failMail: true });
  const saved = await failing.service.createForDeal("deal-ana", ADMIN, { content: "x" });
  assert.ok(failing.notes.has(saved.id));
});

test("crea la nota con autor y menciones; avisa una vez a cada miembro, sin el autor ni repetidos", async () => {
  const { service, sent } = setup();
  const note = await service.createForDeal("deal-ana", ANA, {
    content: "<script>alert(1)</script> Llamar el lunes",
    mentionIds: ["luis", "luis", "ana", "admin"],
  });
  assert.equal(note.authorId, "ana");
  assert.equal(note.dealId, "deal-ana");
  assert.equal(note.content, "<script>alert(1)</script> Llamar el lunes", "se guarda como texto, sin interpretar");
  assert.deepEqual(note.mentions.map((m) => m.id), ["luis", "admin"]);
  assert.deepEqual(sent.map(([to]) => to.email), ["luis@example.test", "admin@example.test"]);
  // El correo enlaza a la ficha y no lleva el texto de la nota.
  const [, author, record, path] = sent[0];
  assert.deepEqual([author, record, path], ["Ana", "negocio «Licencias»", "/pipeline/deal-ana"]);
  assert.ok(!sent.flat().some((part) => typeof part === "string" && part.includes("Llamar")));
});

test("editar con las mismas menciones no vuelve a avisar; una mención nueva avisa solo a esa persona", async () => {
  const { service, sent, audit } = setup();
  const note = await service.createForContact("contact-luis", LUIS, { content: "Primera", mentionIds: ["ana"] });
  await service.update(note.id, LUIS, { content: "Corregida", mentionIds: ["ana"] });
  assert.equal(sent.length, 1);
  const edited = await service.update(note.id, LUIS, { mentionIds: ["ana", "admin"] });
  assert.deepEqual(sent.map(([to]) => to.id), ["ana", "admin"]);
  assert.equal(sent[0][3], "/contactos/contact-luis");
  assert.equal(edited.content, "Corregida");
  assert.ok(edited.editedAt instanceof Date);
  // La auditoría guarda cómo estaba antes de cada edición.
  assert.deepEqual(
    audit.map((a) => [a.action, a.entityType, a.userId, a.changes.content]),
    [
      ["UPDATED", "Note", "luis", "Primera"],
      ["UPDATED", "Note", "luis", "Corregida"],
    ],
  );
});

test("quitar una mención la borra; las demás conservan su aviso", async () => {
  const { service, mentions } = setup();
  const note = await service.createForDeal("deal-ana", ADMIN, { content: "x", mentionIds: ["ana", "luis"] });
  await service.update(note.id, ADMIN, { mentionIds: ["luis"] });
  assert.deepEqual(mentions().map((m) => [m.userId, m.notifiedAt instanceof Date]), [["luis", true]]);
});

test("solo se menciona a miembros activos", async () => {
  const { service, notes } = setup();
  await assert.rejects(
    service.createForDeal("deal-ana", ANA, { content: "x", mentionIds: ["baja"] }),
    BadRequestException,
  );
  await assert.rejects(
    service.createForDeal("deal-ana", ANA, { content: "x", mentionIds: ["nadie"] }),
    BadRequestException,
  );
  assert.equal(notes.size, 0);
});

test("si el correo falla, la nota queda guardada y la mención sigue pendiente para reintentar", async () => {
  const { service, notes, mentions } = setup({ failMail: true });
  const note = await service.createForDeal("deal-ana", ANA, { content: "x", mentionIds: ["luis"] });
  assert.ok(notes.has(note.id));
  assert.equal(mentions()[0].notifiedAt, null);
});

test("VENDEDOR no anota ni toca notas de registros ajenos: 404 sin revelar la nota", async () => {
  const { service } = setup();
  await assert.rejects(service.createForDeal("deal-ana", LUIS, { content: "x" }), NotFoundException);
  await assert.rejects(service.createForContact("contact-luis", ANA, { content: "x" }), NotFoundException);
  const note = await service.createForDeal("deal-ana", ANA, { content: "privada" });
  await assert.rejects(service.update(note.id, LUIS, { content: "y" }), NotFoundException);
  await assert.rejects(service.remove(note.id, LUIS), NotFoundException);
  await assert.rejects(service.update("no-existe", ADMIN, { content: "y" }), NotFoundException);
});

test("editar o borrar: solo el autor o un ADMIN (403 al responsable que no la escribió)", async () => {
  const { service, notes, audit } = setup();
  const note = await service.createForDeal("deal-ana", ADMIN, { content: "del admin", mentionIds: ["luis"] });
  await assert.rejects(service.update(note.id, ANA, { content: "y" }), ForbiddenException);
  await assert.rejects(service.remove(note.id, ANA), ForbiddenException);
  assert.equal(notes.get(note.id).content, "del admin");
  await service.remove(note.id, ADMIN);
  assert.ok(!notes.has(note.id));
  assert.deepEqual(audit.at(-1), {
    action: "DELETED",
    entityType: "Note",
    entityId: note.id,
    userId: "admin",
    changes: { content: "del admin", authorId: "admin", dealId: "deal-ana", contactId: null, mentionIds: ["luis"] },
  });
});

test("el DTO limpia el texto, conserva saltos de línea y exige de 1 a 5000 caracteres", async () => {
  const dto = plainToInstance(CreateNoteDto, { content: "  Hola\r\n\r\n\r\n<b>mundo</b>  " });
  assert.equal(dto.content, "Hola\n\n<b>mundo</b>");
  assert.deepEqual(await validate(dto), []);
  for (const content of ["   ", "x".repeat(5001)]) {
    const errors = await validate(plainToInstance(CreateNoteDto, { content }));
    assert.equal(errors[0].property, "content");
  }
  const many = await validate(
    plainToInstance(CreateNoteDto, { content: "x", mentionIds: Array.from({ length: 21 }, (_, i) => `u${i}`) }),
  );
  assert.equal(many[0].property, "mentionIds");
});
