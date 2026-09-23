const { test } = require("node:test");
const assert = require("node:assert/strict");
const { BadRequestException, ForbiddenException } = require("@nestjs/common");
const { UsersService } = require("../dist/modules/users/users.service.js");
const {
  hashToken,
  INVITATION_TTL_MS,
} = require("../dist/common/tokens.js");

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
  });
  assert.equal(updateData.active, true);
  assert.equal(updateData.invitationTokenHash, null);
  assert.match(updateData.passwordHash, /^\$argon2/);
});

test("rechaza contraseñas de activación que no coinciden", async () => {
  const { users } = service();
  await assert.rejects(
    users.activate("token", {
      password: "Wave2026!",
      passwordConfirmation: "Otra2026!",
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
