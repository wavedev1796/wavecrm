const { test } = require("node:test");
const assert = require("node:assert/strict");
const {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
  UnauthorizedException,
} = require("@nestjs/common");
const argon2 = require("argon2");
const { AuthService } = require("../dist/modules/auth/auth.service.js");
const { hashToken } = require("../dist/common/tokens.js");

const baseUser = {
  id: "user-1",
  email: "eduardo@thewavesea.com",
  name: "Eduardo",
  role: "ADMIN",
  active: true,
  passwordHash: null,
  refreshTokenHash: null,
};

function createService({ user = baseUser, verifyPayload, updatedRows = 1, mailFails = false } = {}) {
  const updates = [];
  const audited = [];
  const sent = [];
  const prisma = {
    user: {
      findUnique: async () => user,
      update: async ({ data }) => {
        updates.push(data);
        return { ...user, ...data };
      },
      updateMany: async ({ data }) => {
        updates.push(data);
        return { count: updatedRows };
      },
    },
    auditLog: {
      create: async ({ data }) => {
        audited.push(data.action);
        return data;
      },
    },
  };
  const mailer = {
    sendPasswordReset: async (recipient, token) => {
      if (mailFails) throw new Error("SMTP caído");
      sent.push({ ...recipient, token });
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
    auth: new AuthService(prisma, jwt, mailer),
    updates,
    signed,
    audited,
    sent,
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

const resetUser = {
  ...baseUser,
  passwordHash: "hash-actual",
  refreshTokenHash: "refresh-actual",
  previousPasswordHashes: [],
  passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
};

/** Cuenta cuya contraseña vigente y anteriores son reales, para probar el historial. */
async function userWithHistory(current, previous = []) {
  return {
    ...resetUser,
    passwordHash: await argon2.hash(current),
    previousPasswordHashes: await Promise.all(previous.map((value) => argon2.hash(value))),
  };
}

test("pedir el enlace guarda solo el hash del token, con una hora de vida, y lo envía", async () => {
  const { auth, updates, sent, audited } = createService({
    user: { ...baseUser, passwordHash: "hash-actual" },
  });

  await auth.requestPasswordReset(baseUser.email);

  const [saved] = updates;
  const [mail] = sent;
  assert.equal(saved.passwordResetTokenHash, hashToken(mail.token));
  assert.notEqual(saved.passwordResetTokenHash, mail.token);
  const minutes = (saved.passwordResetExpiresAt - Date.now()) / 60_000;
  assert.ok(minutes > 58 && minutes <= 60, `vence en ${minutes} minutos`);
  assert.equal(mail.email, baseUser.email);
  assert.deepEqual(audited, ["PASSWORD_RESET_REQUESTED"]);
});

test("pedir el enlace no genera token ni correo para cuentas que no pueden recuperarlo", async () => {
  for (const user of [
    null,
    { ...baseUser, passwordHash: null },
    { ...baseUser, passwordHash: "hash-actual", active: false },
  ]) {
    const { auth, updates, sent } = createService({ user });
    await auth.requestPasswordReset(baseUser.email);
    assert.deepEqual(updates, []);
    assert.deepEqual(sent, []);
  }
});

test("un fallo del correo no cambia la respuesta: delataría qué cuentas existen", async (t) => {
  t.mock.method(Logger.prototype, "error", () => {});
  const { auth, audited } = createService({
    user: { ...baseUser, passwordHash: "hash-actual" },
    mailFails: true,
  });
  await assert.doesNotReject(auth.requestPasswordReset(baseUser.email));
  assert.deepEqual(audited, []);
});

test("restablecer guarda la contraseña nueva, gasta el enlace y cierra las sesiones abiertas", async () => {
  const { auth, updates, audited } = createService({ user: await userWithHistory("Vigente#2026") });

  const result = await auth.resetPassword("token-valido", {
    password: "Wave2026!",
    passwordConfirmation: "Wave2026!",
  });

  assert.equal(result.message, "Contraseña actualizada. Ya puedes iniciar sesión.");
  const [saved] = updates;
  assert.equal(await argon2.verify(saved.passwordHash, "Wave2026!"), true);
  assert.equal(saved.passwordResetTokenHash, null);
  assert.equal(saved.passwordResetExpiresAt, null);
  assert.equal(saved.refreshTokenHash, null);
  assert.deepEqual(audited, ["PASSWORD_RESET_COMPLETED"]);
});

test("restablecer rechaza un enlace vencido, inexistente, de cuenta desactivada o sin token", async () => {
  const dto = { password: "Wave2026!", passwordConfirmation: "Wave2026!" };
  for (const [user, token] of [
    [{ ...resetUser, passwordResetExpiresAt: new Date(Date.now() - 1000) }, "token-vencido"],
    [{ ...resetUser, passwordResetExpiresAt: null }, "token-sin-fecha"],
    [null, "token-inexistente"],
    [{ ...resetUser, active: false }, "token-desactivada"],
    [resetUser, ""],
  ]) {
    const { auth, updates } = createService({ user });
    await assert.rejects(auth.resetPassword(token, dto), BadRequestException);
    assert.deepEqual(updates, []);
  }
});

test("restablecer exige que la confirmación coincida", async () => {
  const { auth } = createService({ user: resetUser });
  await assert.rejects(
    auth.resetPassword("token-valido", {
      password: "Wave2026!",
      passwordConfirmation: "Wave2027!",
    }),
    (error) =>
      error instanceof BadRequestException && error.message === "Las contraseñas no coinciden.",
  );
});

test("un enlace usado dos veces a la vez solo sirve una: la segunda no encuentra la fila", async () => {
  const { auth } = createService({ user: await userWithHistory("Vigente#2026"), updatedRows: 0 });
  await assert.rejects(
    auth.resetPassword("token-valido", {
      password: "Wave2026!",
      passwordConfirmation: "Wave2026!",
    }),
    (error) => error instanceof BadRequestException && error.message === "El enlace ya fue utilizado.",
  );
});

test("restablecer rechaza la contraseña vigente y las anteriores con el mismo mensaje", async () => {
  const user = await userWithHistory("Vigente#2026", ["Anterior#2025", "Antigua#2024"]);
  for (const repetida of ["Vigente#2026", "Anterior#2025", "Antigua#2024"]) {
    const { auth, updates } = createService({ user });
    await assert.rejects(
      auth.resetPassword("token-valido", {
        password: repetida,
        passwordConfirmation: repetida,
      }),
      // El mismo texto para las tres: no dice cuál se repitió ni cuántas se recuerdan.
      (error) =>
        error instanceof ConflictException &&
        error.message === "Elige una contraseña que no hayas usado antes.",
    );
    assert.deepEqual(updates, [], "una contraseña repetida no cambia nada");
  }
});

test("restablecer guarda el historial como hashes y olvida la más antigua", async () => {
  const user = await userWithHistory("Vigente#2026", [
    "Cuarta#2025",
    "Tercera#2024",
    "Segunda#2023",
    "Primera#2022",
  ]);
  const { auth, updates } = createService({ user });

  await auth.resetPassword("token-valido", {
    password: "Nueva#2027",
    passwordConfirmation: "Nueva#2027",
  });

  const [saved] = updates;
  assert.equal(saved.previousPasswordHashes.length, 4, "recuerda 5 contraseñas: la nueva y 4 anteriores");
  assert.equal(saved.previousPasswordHashes[0], user.passwordHash, "la vigente encabeza el historial");
  assert.ok(
    saved.previousPasswordHashes.every((hash) => hash.startsWith("$argon2id$")),
    "el historial son hashes, nunca contraseñas en claro",
  );
  // La más antigua sale del historial y vuelve a poder usarse.
  assert.equal(saved.previousPasswordHashes.includes(user.previousPasswordHashes[3]), false);
});

test("restablecer acepta una contraseña que nunca se usó", async () => {
  const user = await userWithHistory("Vigente#2026", ["Anterior#2025"]);
  const { auth, updates } = createService({ user });

  const result = await auth.resetPassword("token-valido", {
    password: "Nunca#2027",
    passwordConfirmation: "Nunca#2027",
  });

  assert.equal(result.message, "Contraseña actualizada. Ya puedes iniciar sesión.");
  assert.equal(await argon2.verify(updates[0].passwordHash, "Nunca#2027"), true);
});
