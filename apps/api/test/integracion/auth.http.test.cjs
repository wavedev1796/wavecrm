const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const { PASSWORD, cleanup, createUser, uniqueEmail } = require("../../../../test/datos-de-prueba.cjs");
const { startApi } = require("./api.cjs");

let api;
before(async () => {
  api = await startApi();
});
after(async () => {
  await cleanup(api.prisma);
  await api.close();
});

const login = (email, password = PASSWORD) => api.call("/auth/login", { method: "POST", body: { email, password } });
const messageOf = (response) => response.body.error.message;

test("CRM-6: login correcto sin distinguir mayúsculas, sin datos sensibles, y /auth/me identifica a la persona", async () => {
  const user = await createUser(api.prisma, { name: "Ana Prueba" });
  const response = await login(`  ${user.email.toUpperCase()} `);
  assert.equal(response.status, 200);
  assert.ok(response.body.accessToken && response.body.refreshToken);
  assert.deepEqual(response.body.user, { id: user.id, email: user.email, name: "Ana Prueba", role: "VENDEDOR" });

  const me = await api.call("/auth/me", { token: response.body.accessToken });
  assert.equal(me.status, 200);
  assert.equal(me.body.email, user.email);
  assert.equal(me.body.passwordHash, undefined);
});

test("CRM-6: contraseña incorrecta, correo inexistente y cuenta pendiente responden igual", async () => {
  const active = await createUser(api.prisma);
  const pending = await createUser(api.prisma, { pending: true });
  for (const response of [
    await login(active.email, "Incorrecta#1"),
    await login(uniqueEmail("nadie")),
    await login(pending.email),
  ]) {
    assert.equal(response.status, 401);
    assert.equal(messageOf(response), "Credenciales inválidas.");
  }
});

test("Flujo reportado (CRM-6): cuenta desactivada con la contraseña correcta recibe el motivo; con una incorrecta, el genérico", async () => {
  const user = await createUser(api.prisma, { active: false });
  const correct = await login(user.email);
  assert.equal(correct.status, 403);
  assert.equal(messageOf(correct), "Tu cuenta está desactivada. Pide a un administrador que la reactive.");
  const wrong = await login(user.email, "Incorrecta#1");
  assert.equal(wrong.status, 401);
  assert.equal(messageOf(wrong), "Credenciales inválidas.");
});

test("CRM-6: el login valida cada campo con un mensaje en español", async () => {
  for (const [body, expected] of [
    [{ email: "", password: "x" }, ["Ingresa tu correo."]],
    [{ email: "ana@empresa", password: "x" }, ["Escribe un correo válido, por ejemplo nombre@empresa.ec."]],
    [{ email: `${"a".repeat(54)}@empresa.ec`, password: "x" }, ["El correo no puede superar 64 caracteres."]],
    [{ email: uniqueEmail("larga"), password: "a".repeat(17) }, ["La contraseña no puede superar 16 caracteres."]],
    [{ email: uniqueEmail("vacia"), password: "" }, ["Ingresa tu contraseña."]],
    [{ email: uniqueEmail("extra"), password: "x", rol: "ADMIN" }, ["El campo «rol» no está permitido."]],
  ]) {
    const response = await api.call("/auth/login", { method: "POST", body });
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.deepEqual(messageOf(response), expected);
  }
});

test("CRM-6: JSON roto, ruta mal codificada y cuerpo gigante reciben un mensaje claro", async () => {
  const broken = await api.call("/auth/login", { method: "POST", body: '{"email":' });
  assert.equal(broken.status, 400);
  assert.equal(messageOf(broken), "La solicitud no tiene un formato válido.");

  const badPath = await api.call("/users/invitations/%E0%A4%A");
  assert.equal(badPath.status, 400);
  assert.equal(messageOf(badPath), "La solicitud no tiene un formato válido.");

  const huge = await api.call("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email: "a@b.ec", password: "x".repeat(200_000) }),
  });
  assert.equal(huge.status, 413);
  assert.equal(messageOf(huge), "La solicitud es demasiado grande.");
});

test("CRM-6: 5 intentos por minuto por correo, sin bloquear otras cuentas", async () => {
  const target = uniqueEmail("limite");
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    assert.equal((await login(target, "Incorrecta#1")).status, 401, `intento ${attempt}`);
  }
  const blocked = await login(target, "Incorrecta#1");
  assert.equal(blocked.status, 429);
  assert.equal(messageOf(blocked), "Demasiados intentos. Espera un minuto e inténtalo de nuevo.");

  const other = await createUser(api.prisma);
  assert.equal((await login(other.email)).status, 200);
});

test("CRM-6: el refresh rota los tokens; el anterior y un access token no sirven como refresh", async () => {
  const user = await createUser(api.prisma);
  const first = (await login(user.email)).body;
  const renewed = await api.call("/auth/refresh", { method: "POST", body: { refreshToken: first.refreshToken } });
  assert.equal(renewed.status, 200);
  assert.notEqual(renewed.body.refreshToken, first.refreshToken);

  for (const refreshToken of [first.refreshToken, renewed.body.accessToken]) {
    const rejected = await api.call("/auth/refresh", { method: "POST", body: { refreshToken } });
    assert.equal(rejected.status, 401);
    assert.equal(messageOf(rejected), "Refresh token inválido o expirado.");
  }
});

test("CRM-10: logout revoca el refresh vigente y responde 204 incluso con un token basura", async () => {
  const user = await createUser(api.prisma);
  const { refreshToken } = (await login(user.email)).body;
  assert.equal((await api.call("/auth/logout", { method: "POST", body: { refreshToken } })).status, 204);
  assert.equal((await api.call("/auth/refresh", { method: "POST", body: { refreshToken } })).status, 401);
  assert.equal((await api.call("/auth/logout", { method: "POST", body: { refreshToken: "token-basura" } })).status, 204);
});

test("CRM-10: los guards exigen un access token válido de una cuenta activa", async () => {
  const noToken = await api.call("/auth/me");
  assert.equal(noToken.status, 401);
  assert.equal(messageOf(noToken), "Token de acceso requerido.");

  const user = await createUser(api.prisma);
  const tokens = (await login(user.email)).body;
  const withRefresh = await api.call("/auth/me", { token: tokens.refreshToken });
  assert.equal(withRefresh.status, 401);
  assert.equal(messageOf(withRefresh), "Token de acceso inválido o expirado.");

  await api.prisma.user.update({ where: { id: user.id }, data: { active: false } });
  assert.equal((await api.call("/auth/me", { token: tokens.accessToken })).status, 401);
});

const forgot = (email) => api.call("/auth/forgot-password", { method: "POST", body: { email } });
const NEW_PASSWORD = "Recuperada#2026";
const resetWith = (token, password = NEW_PASSWORD, passwordConfirmation = password) =>
  api.call(`/auth/password-resets/${encodeURIComponent(token)}`, {
    method: "POST",
    body: { password, passwordConfirmation },
  });

test("CRM-8: el enlace de recuperación cambia la contraseña, cierra las sesiones abiertas y solo sirve una vez", async () => {
  const user = await createUser(api.prisma, { name: "Ana Prueba" });
  const { refreshToken } = (await login(user.email)).body;

  const requested = await forgot(user.email.toUpperCase());
  assert.equal(requested.status, 200);
  const mail = api.inbox.at(-1);
  assert.equal(mail.kind, "password-reset");
  assert.equal(mail.email, user.email);

  // La base guarda el hash del enlace, nunca el enlace que viaja por correo.
  const stored = await api.prisma.user.findUnique({ where: { id: user.id } });
  assert.ok(stored.passwordResetTokenHash);
  assert.notEqual(stored.passwordResetTokenHash, mail.token);

  const preview = await api.call(`/auth/password-resets/${encodeURIComponent(mail.token)}`);
  assert.equal(preview.status, 200);
  assert.equal(preview.body.name, "Ana Prueba");

  assert.equal((await resetWith(mail.token)).status, 200);
  assert.equal((await login(user.email, NEW_PASSWORD)).status, 200);
  assert.equal((await login(user.email)).status, 401);
  // La sesión que estaba abierta muere con el cambio de contraseña.
  const oldSession = await api.call("/auth/refresh", { method: "POST", body: { refreshToken } });
  assert.equal(oldSession.status, 401);

  const reused = await resetWith(mail.token);
  assert.equal(reused.status, 400);
  assert.equal(messageOf(reused), "El enlace no existe, venció o ya fue utilizado.");
});

test("CRM-8: pedir el enlace responde igual para una cuenta inexistente, pendiente o desactivada", async () => {
  const pending = await createUser(api.prisma, { pending: true });
  const disabled = await createUser(api.prisma, { active: false });
  const before = api.inbox.length;

  const responses = [await forgot(uniqueEmail("nadie")), await forgot(pending.email), await forgot(disabled.email)];
  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.equal(response.body.message, responses[0].body.message);
  }
  assert.equal(api.inbox.length, before, "ninguna de las tres debe recibir correo");
});

test("CRM-8: un enlace vencido, inexistente o con una contraseña débil no cambia nada", async () => {
  const user = await createUser(api.prisma);
  await forgot(user.email);
  const { token } = api.inbox.at(-1);
  await api.prisma.user.update({
    where: { id: user.id },
    data: { passwordResetExpiresAt: new Date(Date.now() - 1000) },
  });

  const expired = await resetWith(token);
  assert.equal(expired.status, 400);
  assert.equal(messageOf(expired), "El enlace no existe, venció o ya fue utilizado.");
  assert.equal((await api.call("/auth/password-resets/enlace-inventado")).status, 400);

  await api.prisma.user.update({
    where: { id: user.id },
    data: { passwordResetExpiresAt: new Date(Date.now() + 60 * 60 * 1000) },
  });
  for (const [password, confirmation, expected] of [
    ["corta1!", "corta1!", "La contraseña debe tener entre 8 y 16 caracteres."],
    ["sinnumeros!!", "sinnumeros!!", "La contraseña debe incluir una mayúscula, una minúscula, un número y un carácter especial."],
    [NEW_PASSWORD, "Otra#2026", "Las contraseñas no coinciden."],
  ]) {
    const rejected = await resetWith(token, password, confirmation);
    assert.equal(rejected.status, 400);
    assert.deepEqual([messageOf(rejected)].flat(), [expected]);
  }
  // La contraseña original sigue sirviendo: ningún intento fallido la tocó.
  assert.equal((await login(user.email)).status, 200);
});

test("CRM-8: una contraseña ya usada se rechaza con un mensaje que no dice cuál era", async () => {
  const user = await createUser(api.prisma);
  const segunda = "Segunda#2026";

  // 1) La vigente no se puede repetir.
  await forgot(user.email);
  const primerEnlace = api.inbox.at(-1).token;
  const repiteVigente = await resetWith(primerEnlace, PASSWORD);
  assert.equal(repiteVigente.status, 409);
  assert.equal(messageOf(repiteVigente), "Elige una contraseña que no hayas usado antes.");

  // 2) El enlace sigue sirviendo: el intento fallido no lo gastó.
  assert.equal((await resetWith(primerEnlace, segunda)).status, 200);
  assert.equal((await login(user.email, segunda)).status, 200);

  // 3) Ahora tampoco se puede volver a la anterior, con el mismo mensaje exacto.
  await forgot(user.email);
  const segundoEnlace = api.inbox.at(-1).token;
  const repiteAnterior = await resetWith(segundoEnlace, PASSWORD);
  assert.equal(repiteAnterior.status, 409);
  assert.equal(messageOf(repiteAnterior), messageOf(repiteVigente));

  // 4) El historial viaja como hashes argon2, nunca como contraseñas.
  const stored = await api.prisma.user.findUnique({ where: { id: user.id } });
  assert.equal(stored.previousPasswordHashes.length, 1);
  assert.ok(stored.previousPasswordHashes[0].startsWith("$argon2id$"));
});
