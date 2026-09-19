const { test } = require("node:test");
const assert = require("node:assert/strict");
const { ForbiddenException, UnauthorizedException } = require("@nestjs/common");
const argon2 = require("argon2");
const { AuthService } = require("../dist/modules/auth/auth.service.js");

const baseUser = {
  id: "user-1",
  email: "eduardo@thewavesea.com",
  name: "Eduardo",
  role: "ADMIN",
  active: true,
  passwordHash: null,
  refreshTokenHash: null,
};

function createService({ user = baseUser, verifyPayload } = {}) {
  const updates = [];
  const prisma = {
    user: {
      findUnique: async () => user,
      update: async ({ data }) => {
        updates.push(data);
        return { ...user, ...data };
      },
    },
  };
  const signed = [];
  const jwt = {
    signAsync: async (payload, options) => {
      signed.push({ payload, options });
      return payload.type === "access"
        ? "access-token"
        : `refresh-token-${payload.jti}`;
    },
    verifyAsync: async () => {
      if (verifyPayload instanceof Error) throw verifyPayload;
      return verifyPayload;
    },
  };
  return {
    auth: new AuthService(prisma, jwt),
    updates,
    signed,
  };
}

test("login emite access y refresh token y persiste solo el hash", async () => {
  const passwordHash = await argon2.hash("Wave2026!");
  const { auth, updates, signed } = createService({
    user: { ...baseUser, passwordHash },
  });

  const result = await auth.login(baseUser.email, "Wave2026!");

  assert.equal(result.accessToken, "access-token");
  assert.match(result.refreshToken, /^refresh-token-/);
  assert.deepEqual(result.user, {
    id: baseUser.id,
    email: baseUser.email,
    name: baseUser.name,
    role: baseUser.role,
  });
  assert.equal(signed[0].options.expiresIn, "15m");
  assert.equal(signed[1].options.expiresIn, "8h");
  assert.ok(signed[1].payload.jti);
  assert.equal(
    await argon2.verify(updates[0].refreshTokenHash, result.refreshToken),
    true,
  );
});

test("login no revela si la cuenta no existe, está inactiva o la clave falla", async () => {
  const passwordHash = await argon2.hash("Wave2026!");
  for (const user of [
    null,
    { ...baseUser, active: false, passwordHash },
    { ...baseUser, passwordHash },
  ]) {
    const { auth } = createService({ user });
    await assert.rejects(
      auth.login(baseUser.email, "Incorrecta2026!"),
      (error) =>
        error instanceof UnauthorizedException &&
        error.message === "Credenciales inválidas.",
    );
  }
});

test("refresh válido rota ambos tokens", async () => {
  const currentToken = "refresh-vigente";
  const refreshTokenHash = await argon2.hash(currentToken);
  const { auth, updates } = createService({
    user: { ...baseUser, refreshTokenHash },
    verifyPayload: {
      sub: baseUser.id,
      email: baseUser.email,
      role: baseUser.role,
      type: "refresh",
    },
  });

  const result = await auth.refresh(currentToken);

  assert.equal(result.accessToken, "access-token");
  assert.match(result.refreshToken, /^refresh-token-/);
  assert.equal(
    await argon2.verify(updates[0].refreshTokenHash, result.refreshToken),
    true,
  );
});

test("refresh rechaza token expirado, de acceso o revocado", async () => {
  for (const setup of [
    { verifyPayload: new Error("expirado") },
    {
      verifyPayload: {
        sub: baseUser.id,
        email: baseUser.email,
        role: baseUser.role,
        type: "access",
      },
    },
    {
      user: { ...baseUser, refreshTokenHash: null },
      verifyPayload: {
        sub: baseUser.id,
        email: baseUser.email,
        role: baseUser.role,
        type: "refresh",
      },
    },
  ]) {
    const { auth } = createService(setup);
    await assert.rejects(auth.refresh("token"), UnauthorizedException);
  }
});

test("logout revoca únicamente el refresh token vigente", async () => {
  const currentToken = "refresh-vigente";
  const refreshTokenHash = await argon2.hash(currentToken);
  const { auth, updates } = createService({
    user: { ...baseUser, refreshTokenHash },
    verifyPayload: {
      sub: baseUser.id,
      email: baseUser.email,
      role: baseUser.role,
      type: "refresh",
    },
  });

  await auth.logout(currentToken);
  assert.deepEqual(updates, [{ refreshTokenHash: null }]);
});

test("me devuelve una cuenta activa y rechaza una inactiva", async () => {
  const active = createService();
  assert.equal((await active.auth.me(baseUser.id)).email, baseUser.email);

  const inactive = createService({ user: { ...baseUser, active: false } });
  await assert.rejects(inactive.auth.me(baseUser.id), UnauthorizedException);
});

test("login con la contraseña correcta de una cuenta desactivada explica el motivo", async () => {
  const passwordHash = await argon2.hash("Wave2026!");
  const { auth, updates } = createService({ user: { ...baseUser, active: false, passwordHash } });
  await assert.rejects(
    auth.login(baseUser.email, "Wave2026!"),
    (error) =>
      error instanceof ForbiddenException &&
      error.message === "Tu cuenta está desactivada. Pide a un administrador que la reactive.",
  );
  assert.deepEqual(updates, []);
});

test("login de una cuenta pendiente de activación sigue siendo genérico", async () => {
  const { auth } = createService({ user: { ...baseUser, active: false, passwordHash: null } });
  await assert.rejects(
    auth.login(baseUser.email, "Wave2026!"),
    (error) => error instanceof UnauthorizedException && error.message === "Credenciales inválidas.",
  );
});

test("login calcula argon2 aunque el correo no exista, para no revelarlo por el tiempo", async (t) => {
  const verify = t.mock.method(argon2, "verify");
  const { auth } = createService({ user: null });
  await assert.rejects(auth.login("nadie@empresa.ec", "Wave2026!"), UnauthorizedException);
  assert.equal(verify.mock.callCount(), 1);
});
