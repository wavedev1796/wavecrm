const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} = require("@nestjs/common");
const { Prisma } = require("@wave/database");
const { UsersService } = require("../../../dist/modules/users/users.service.js");
const {
  hashToken,
  INVITATION_TTL_MS,
} = require("../../../dist/common/tokens.js");

const baseUser = {
  id: "user-2",
  name: "Ana López",
  email: "ana@empresa.ec",
  role: "VENDEDOR",
  active: false,
  passwordHash: null,
  refreshTokenHash: null,
  invitationTokenHash: null,
  invitationExpiresAt: null,
  invitationSentAt: null,
  activatedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function service(overrides = {}) {
  const auditLog = { create: async () => ({}) };
  const prisma = {
    user: {
      create: async ({ data }) => ({ ...baseUser, ...data }),
      findUnique: async () => baseUser,
      count: async () => 1,
      update: async ({ data }) => ({ ...baseUser, ...data }),
      updateMany: async () => ({ count: 1 }),
      delete: async () => baseUser,
      ...overrides.user,
    },
    auditLog,
    ...overrides.prisma,
  };
  const sent = [];
  const mailer = {
    sendInvitation: async (recipient, token) => sent.push({ recipient, token }),
  };
  return { users: new UsersService(prisma, mailer), prisma, sent };
}

test("lista usuarios aplicando búsqueda, estado y paginación", async () => {
  let findManyArgs;
  let countArgs;
  const listedUser = { ...baseUser, active: true, passwordHash: "hash" };
  const { users } = service({
    user: {
      findMany: async (args) => {
        findManyArgs = args;
        return [listedUser];
      },
      count: async (args) => {
        countArgs = args;
        return 1;
      },
    },
    prisma: {
      $transaction: async (operations) => Promise.all(operations),
    },
  });

  const result = await users.list({
    page: 2,
    limit: 10,
    search: "ana",
    status: "active",
  });

  assert.equal(findManyArgs.skip, 10);
  assert.equal(findManyArgs.take, 10);
  assert.equal(findManyArgs.where.active, true);
  assert.equal(findManyArgs.where.OR[0].name.contains, "ana");
  assert.deepEqual(countArgs.where, findManyArgs.where);
  assert.equal(result.data[0].status, "active");
  assert.deepEqual(result.meta, {
    page: 2,
    limit: 10,
    total: 1,
    totalPages: 1,
  });
});

test("crea una cuenta pendiente y envía un token cuyo hash se persiste", async () => {
  let createData;
  const { users, sent } = service({
    user: {
      create: async ({ data }) => {
        createData = data;
        return { ...baseUser, ...data };
      },
    },
  });
  const before = Date.now();
  const result = await users.create(
    { name: "Ana López", email: "ana@empresa.ec", role: "VENDEDOR" },
    "admin-1",
  );
  assert.equal(result.status, "pending");
  assert.equal(result.passwordHash, undefined);
  assert.equal(sent.length, 1);
  assert.equal(
    createData.invitationTokenHash,
    hashToken(sent[0].token),
  );
  assert.ok(
    createData.invitationExpiresAt.getTime() >= before + INVITATION_TTL_MS,
  );
});

test("activa una invitación válida, guarda la contraseña y consume el token", async () => {
  const rawToken = "token-valido";
  let updateData;
  const { users } = service({
    user: {
      findUnique: async () => ({
        ...baseUser,
        invitationTokenHash: hashToken(rawToken),
        invitationExpiresAt: new Date(Date.now() + 60_000),
      }),
      updateMany: async ({ data }) => {
        updateData = data;
        return { count: 1 };
      },
    },
  });
  await users.activate(rawToken, {
    password: "Wave2026!",
    passwordConfirmation: "Wave2026!",
    termsAccepted: true,
  });
  assert.equal(updateData.active, true);
  assert.equal(updateData.invitationTokenHash, null);
  assert.ok(updateData.termsAcceptedAt instanceof Date);
  assert.equal(updateData.termsVersion, "1.0");
  assert.match(updateData.passwordHash, /^\$argon2/);
});

test("rechaza contraseñas de activación que no coinciden", async () => {
  const { users } = service();
  await assert.rejects(
    users.activate("token", {
      password: "Wave2026!",
      passwordConfirmation: "Otra2026!",
      termsAccepted: true,
    }),
    BadRequestException,
  );
});

test("impide que un administrador se desactive a sí mismo", async () => {
  const { users } = service();
  await assert.rejects(
    users.deactivate("admin-1", "admin-1"),
    BadRequestException,
  );
});

test("impide desactivar al último administrador activo", async () => {
  const { users } = service({
    user: {
      findUnique: async () => ({
        ...baseUser,
        id: "admin-2",
        role: "ADMIN",
        active: true,
        passwordHash: "hash",
      }),
      count: async () => 0,
    },
  });
  await assert.rejects(
    users.deactivate("admin-2", "admin-1"),
    ForbiddenException,
  );
});

test("edita nombre, correo y asigna un rol", async () => {
  let updateData;
  const { users } = service({
    user: {
      update: async ({ data }) => {
        updateData = data;
        return { ...baseUser, ...data };
      },
    },
  });
  const result = await users.update(
    "user-2",
    { name: "Ana Admin", email: "admin@empresa.ec", role: "ADMIN" },
    "admin-1",
  );
  assert.deepEqual(updateData, {
    name: "Ana Admin",
    email: "admin@empresa.ec",
    role: "ADMIN",
  });
  assert.equal(result.role, "ADMIN");
});

test("desactiva un usuario y revoca su refresh token", async () => {
  let updateData;
  const { users } = service({
    user: {
      findUnique: async () => ({
        ...baseUser,
        active: true,
        passwordHash: "hash",
      }),
      update: async ({ data }) => {
        updateData = data;
        return { ...baseUser, passwordHash: "hash", ...data };
      },
    },
  });
  const result = await users.deactivate("user-2", "admin-1");
  assert.deepEqual(updateData, { active: false, refreshTokenHash: null });
  assert.equal(result.status, "inactive");
});

test("reactiva una cuenta previamente activada", async () => {
  const { users } = service({
    user: {
      findUnique: async () => ({ ...baseUser, passwordHash: "hash" }),
      update: async ({ data }) => ({
        ...baseUser,
        passwordHash: "hash",
        ...data,
      }),
    },
  });
  const result = await users.reactivate("user-2", "admin-1");
  assert.equal(result.active, true);
  assert.equal(result.status, "active");
});

const prismaError = (code) =>
  new Prisma.PrismaClientKnownRequestError(code, { code, clientVersion: "6" });
const throwing = (error) => async () => {
  throw error;
};

test("el listado filtra por rol y por cuentas inactivas o pendientes", async () => {
  const wheres = [];
  const { users } = service({
    user: {
      findMany: async ({ where }) => {
        wheres.push(where);
        return [baseUser];
      },
    },
    prisma: { $transaction: async (operations) => Promise.all(operations) },
  });
  const page = { page: 1, limit: 10 };
  await users.list({ ...page, role: "ADMIN", status: "inactive" });
  await users.list({ ...page, status: "pending" });
  assert.deepEqual(wheres[0], {
    role: "ADMIN",
    active: false,
    passwordHash: { not: null },
  });
  assert.deepEqual(wheres[1], { passwordHash: null });
});

test("la ficha de usuario oculta el hash y responde 404 si no existe", async () => {
  const { users } = service({
    user: { findUnique: async () => ({ ...baseUser, passwordHash: "hash" }) },
  });
  const user = await users.findOne("user-2");
  assert.equal(user.passwordHash, undefined);
  assert.equal(user.status, "inactive");

  const missing = service({ user: { findUnique: async () => null } }).users;
  await assert.rejects(missing.findOne("x"), NotFoundException);
  await assert.rejects(missing.reactivate("x", "admin-1"), NotFoundException);
});

test("crear o editar con un correo repetido responde 409 y otros errores se propagan", async () => {
  const dto = { name: "Ana", email: "ana@empresa.ec", role: "VENDEDOR" };
  const duplicated = service({
    user: { create: throwing(prismaError("P2002")), update: throwing(prismaError("P2002")) },
  }).users;
  await assert.rejects(duplicated.create(dto, "admin-1"), ConflictException);
  await assert.rejects(duplicated.update("user-2", dto, "admin-1"), ConflictException);

  const broken = service({
    user: { create: throwing(new Error("caída")), update: throwing(new Error("caída")) },
  }).users;
  await assert.rejects(broken.create(dto, "admin-1"), /caída/);
  await assert.rejects(broken.update("user-2", dto, "admin-1"), /caída/);
});

test("si el correo de invitación falla, la cuenta creada se borra y el error sube", async () => {
  let deleted;
  const { prisma } = service({
    user: {
      delete: async ({ where }) => {
        deleted = where.id;
        throw new Error("ya no existe");
      },
    },
  });
  const failing = new UsersService(prisma, {
    sendInvitation: throwing(new Error("SMTP caído")),
  });
  await assert.rejects(
    failing.create({ name: "Ana", email: "ana@empresa.ec", role: "VENDEDOR" }, "admin-1"),
    /SMTP caído/,
  );
  assert.equal(deleted, "user-2");
});

test("bajar de rol al último administrador está prohibido", async () => {
  const { users } = service({
    user: {
      findUnique: async () => ({ ...baseUser, role: "ADMIN", active: true, passwordHash: "h" }),
      count: async () => 0,
    },
  });
  await assert.rejects(users.update("user-2", { role: "VENDEDOR" }, "admin-1"), ForbiddenException);
});

test("una cuenta pendiente no se reactiva: se activa desde su invitación", async () => {
  await assert.rejects(service().users.reactivate("user-2", "admin-1"), BadRequestException);
});

test("reenviar la invitación genera un token nuevo, salvo si la cuenta ya está activa", async () => {
  let updateData;
  const { users, sent } = service({
    user: {
      update: async ({ data }) => {
        updateData = data;
        return { ...baseUser, ...data };
      },
    },
  });
  const result = await users.resendInvitation("user-2", "admin-1");
  assert.equal(sent.length, 1);
  assert.equal(updateData.invitationTokenHash, hashToken(sent[0].token));
  assert.equal(result.status, "pending");

  const active = service({ user: { findUnique: async () => ({ ...baseUser, passwordHash: "h" }) } });
  await assert.rejects(
    active.users.resendInvitation("user-2", "admin-1"),
    (error) => error instanceof BadRequestException && error.message === "Esta cuenta ya fue activada.",
  );
});

test("eliminar un usuario: no a sí mismo, conserva al último admin y avisa si tiene actividad", async () => {
  let audited;
  const { users } = service({
    prisma: { auditLog: { create: async ({ data }) => (audited = data) } },
  });
  await users.remove("user-2", "admin-1");
  assert.equal(audited.action, "USER_DELETED");
  assert.deepEqual(audited.changes, { email: "ana@empresa.ec" });

  await assert.rejects(users.remove("admin-1", "admin-1"), BadRequestException);
  const lastAdmin = service({
    user: {
      findUnique: async () => ({ ...baseUser, role: "ADMIN", active: true }),
      count: async () => 0,
    },
  }).users;
  await assert.rejects(lastAdmin.remove("user-2", "admin-1"), ForbiddenException);
  await assert.rejects(
    service({ user: { delete: throwing(prismaError("P2003")) } }).users.remove("user-2", "admin-1"),
    (error) => error instanceof ConflictException && error.message.startsWith("Este usuario tiene actividad"),
  );
  await assert.rejects(
    service({ user: { delete: throwing(new Error("caída")) } }).users.remove("user-2", "admin-1"),
    /caída/,
  );
});

test("la invitación vigente muestra el correo enmascarado", async () => {
  const expiresAt = new Date(Date.now() + 60_000);
  const { users } = service({
    user: { findUnique: async () => ({ ...baseUser, invitationExpiresAt: expiresAt }) },
  });
  assert.deepEqual(await users.invitation("token"), {
    email: "an*@empresa.ec",
    name: "Ana López",
    expiresAt,
  });
});

test("una invitación inválida, vencida, usada o consumida a la vez se rechaza", async () => {
  const activation = { password: "Wave2026!", passwordConfirmation: "Wave2026!", termsAccepted: true };
  await assert.rejects(service().users.invitation(""), /Invitación inválida/);
  await assert.rejects(service().users.invitation("x".repeat(201)), /Invitación inválida/);
  for (const found of [
    null,
    { ...baseUser, passwordHash: "h", invitationExpiresAt: new Date(Date.now() + 60_000) },
    { ...baseUser, invitationExpiresAt: null },
    { ...baseUser, invitationExpiresAt: new Date(Date.now() - 1) },
  ]) {
    await assert.rejects(
      service({ user: { findUnique: async () => found } }).users.invitation("token"),
      /no existe, venció o ya fue utilizada/,
    );
  }
  const raced = service({
    user: {
      findUnique: async () => ({ ...baseUser, invitationExpiresAt: new Date(Date.now() + 60_000) }),
      updateMany: async () => ({ count: 0 }),
    },
  });
  await assert.rejects(raced.users.activate("token", activation), /ya fue utilizada/);
});
