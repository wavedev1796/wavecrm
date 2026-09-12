const { test } = require("node:test");
const assert = require("node:assert/strict");
const { BadRequestException, ForbiddenException } = require("@nestjs/common");
const { UsersService } = require("../dist/modules/users/users.service.js");
const {
  hashInvitationToken,
  INVITATION_TTL_MS,
} = require("../dist/modules/users/invitation-token.js");

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
    hashInvitationToken(sent[0].token),
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
        invitationTokenHash: hashInvitationToken(rawToken),
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
