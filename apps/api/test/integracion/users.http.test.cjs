const { after, before, test } = require("node:test");
const assert = require("node:assert/strict");
const { PASSWORD, cleanup, createUser, uniqueEmail } = require("../../../../test/datos-de-prueba.cjs");
const { startApi } = require("./api.cjs");

let api;
let admin;
let adminToken;
let seller;
let sellerToken;
const invited = { email: uniqueEmail("invitada") };

const login = (email, password = PASSWORD) => api.call("/auth/login", { method: "POST", body: { email, password } });
const messageOf = (response) => response.body.error.message;
const asAdmin = (path, options = {}) => api.call(path, { ...options, token: adminToken });

before(async () => {
  api = await startApi();
  admin = await createUser(api.prisma, { role: "ADMIN", name: "Admin Prueba" });
  adminToken = (await login(admin.email)).body.accessToken;
  seller = await createUser(api.prisma, { name: "Vendedora Prueba" });
  sellerToken = (await login(seller.email)).body.accessToken;
});
after(async () => {
  await cleanup(api.prisma);
  await api.close();
});

test("CRM-6/CRM-9: solo un administrador gestiona usuarios", async () => {
  const forbidden = await api.call("/users", { token: sellerToken });
  assert.equal(forbidden.status, 403);
  assert.equal(messageOf(forbidden), "No tienes permisos para esta operación.");
  assert.equal((await api.call("/users")).status, 401);
  assert.equal((await asAdmin("/users")).status, 200);
});

test("CRM-9: invitar valida cada campo con mensajes claros", async () => {
  for (const [body, expected] of [
    [{ name: "", email: "", role: "" }, ["Ingresa el nombre.", "Ingresa tu correo.", "Elige un rol válido."]],
    [
      { name: "Ana2", email: uniqueEmail("a"), role: "VENDEDOR" },
      ["El nombre solo puede tener letras, espacios, apóstrofos, guiones y puntos."],
    ],
    [
      { name: "<script>alert(1)</script>", email: uniqueEmail("b"), role: "VENDEDOR" },
      ["El nombre solo puede tener letras, espacios, apóstrofos, guiones y puntos."],
    ],
    [{ name: "Ana", email: "ana@empresa", role: "VENDEDOR" }, ["Escribe un correo válido, por ejemplo nombre@empresa.ec."]],
    [{ name: "Ana", email: uniqueEmail("c"), role: "ROOT" }, ["Elige un rol válido."]],
    [
      { name: "Ana", email: uniqueEmail("d"), role: "VENDEDOR", passwordHash: "x" },
      ["El campo «passwordHash» no está permitido."],
    ],
  ]) {
    const response = await asAdmin("/users", { method: "POST", body });
    assert.equal(response.status, 400, JSON.stringify(body));
    assert.deepEqual(messageOf(response), expected);
  }
});

test("CRM-9: invitar crea una cuenta pendiente con datos normalizados y rechaza duplicados", async () => {
  const created = await asAdmin("/users", {
    method: "POST",
    body: { name: "  Ana   Invitada ", email: `  ${invited.email.toUpperCase()} `, role: "VENDEDOR" },
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.status, "pending");
  assert.equal(created.body.name, "Ana Invitada");
  assert.equal(created.body.email, invited.email);
  assert.equal(created.body.passwordHash, undefined);
  invited.id = created.body.id;
  invited.token = api.inbox.find((mail) => mail.email === invited.email).token;

  const duplicate = await asAdmin("/users", {
    method: "POST",
    body: { name: "Otra Persona", email: invited.email.toUpperCase(), role: "ADMIN" },
  });
  assert.equal(duplicate.status, 409);
  assert.equal(messageOf(duplicate), "Ya existe una cuenta con ese correo.");
});

test("CRM-7: la invitación enmascara el correo y la activación exige las reglas de contraseña", async () => {
  const preview = await api.call(`/users/invitations/${invited.token}`);
  assert.equal(preview.status, 200);
  assert.equal(preview.body.name, "Ana Invitada");
  assert.match(preview.body.email, /^in\*+@pruebas\.example\.com$/);

  const activate = (password, passwordConfirmation = password) =>
    api.call(`/users/invitations/${invited.token}/activate`, {
      method: "POST",
      body: { password, passwordConfirmation },
    });

  const weak = await activate("abcdefg1!");
  assert.equal(weak.status, 400);
  assert.deepEqual(messageOf(weak), [
    "La contraseña debe incluir una mayúscula, una minúscula, un número y un carácter especial.",
  ]);
  assert.deepEqual(messageOf(await activate("Abcdefgh1!Abcdefg")), [
    "La contraseña debe tener entre 8 y 16 caracteres.",
  ]);
  assert.equal(messageOf(await activate(PASSWORD, "Otra#2026a")), "Las contraseñas no coinciden.");

  const ok = await activate(PASSWORD);
  assert.equal(ok.status, 200);
  assert.equal(ok.body.message, "Cuenta activada correctamente.");
  const reused = await activate(PASSWORD);
  assert.equal(reused.status, 400);
  assert.equal(messageOf(reused), "La invitación no existe, venció o ya fue utilizada.");

  assert.equal((await login(invited.email)).status, 200);
});

test("CRM-9: listar busca sin distinguir mayúsculas en la base real y valida filtros", async () => {
  const fragment = seller.email.split("@")[0].toUpperCase();
  const found = await asAdmin(`/users?search=${encodeURIComponent(fragment)}`);
  assert.equal(found.status, 200);
  assert.deepEqual(
    found.body.data.map((user) => user.email),
    [seller.email],
  );

  for (const [query, expected] of [
    ["page=abc", "La página debe ser un número entero mayor que 0."],
    ["limit=500", "El límite debe ser un número entero entre 1 y 100."],
    [`search=${"x".repeat(101)}`, "La búsqueda no puede superar 100 caracteres."],
    ["status=borrado", "Elige un estado válido."],
  ]) {
    const response = await asAdmin(`/users?${query}`);
    assert.equal(response.status, 400, query);
    assert.deepEqual(messageOf(response), [expected]);
  }
});

test("CRM-9: editar normaliza datos y rechaza correos repetidos o nombres inválidos", async () => {
  const renamed = await asAdmin(`/users/${seller.id}`, { method: "PATCH", body: { name: "Vendedora   Editada" } });
  assert.equal(renamed.status, 200);
  assert.equal(renamed.body.name, "Vendedora Editada");

  const duplicate = await asAdmin(`/users/${seller.id}`, {
    method: "PATCH",
    body: { email: admin.email.toUpperCase() },
  });
  assert.equal(duplicate.status, 409);
  assert.equal(messageOf(duplicate), "Ya existe una cuenta con ese correo.");

  const invalid = await asAdmin(`/users/${seller.id}`, { method: "PATCH", body: { name: "X" } });
  assert.equal(invalid.status, 400);
  assert.deepEqual(messageOf(invalid), ["El nombre debe tener entre 2 y 100 caracteres."]);
});

test("Flujo reportado (CRM-9 + CRM-6): desactivar corta la sesión y el login explica el motivo; reactivar lo devuelve", async () => {
  const self = await asAdmin(`/users/${admin.id}/deactivate`, { method: "PATCH" });
  assert.equal(self.status, 400);
  assert.equal(messageOf(self), "No puedes desactivar tu propia cuenta.");

  const deactivated = await asAdmin(`/users/${seller.id}/deactivate`, { method: "PATCH" });
  assert.equal(deactivated.status, 200);
  assert.equal(deactivated.body.status, "inactive");
  assert.equal((await api.call("/auth/me", { token: sellerToken })).status, 401);

  const refused = await login(seller.email);
  assert.equal(refused.status, 403);
  assert.equal(messageOf(refused), "Tu cuenta está desactivada. Pide a un administrador que la reactive.");

  const reactivated = await asAdmin(`/users/${seller.id}/reactivate`, { method: "PATCH" });
  assert.equal(reactivated.body.status, "active");
  assert.equal((await login(seller.email)).status, 200);
});

test("CRM-9: reenviar invitación y reactivar respetan el estado de la cuenta", async () => {
  const pending = await createUser(api.prisma, { pending: true });
  const resent = await asAdmin(`/users/${pending.id}/resend-invitation`, { method: "POST" });
  assert.equal(resent.status, 201);
  assert.ok(api.inbox.some((mail) => mail.email === pending.email));

  const alreadyActive = await asAdmin(`/users/${seller.id}/resend-invitation`, { method: "POST" });
  assert.equal(alreadyActive.status, 400);
  assert.equal(messageOf(alreadyActive), "Esta cuenta ya fue activada.");

  const reactivatePending = await asAdmin(`/users/${pending.id}/reactivate`, { method: "PATCH" });
  assert.equal(reactivatePending.status, 400);
  assert.equal(messageOf(reactivatePending), "La cuenta pendiente debe activarse desde su invitación.");
});

test("CRM-9: eliminar protege la propia cuenta y responde 404 después", async () => {
  const self = await asAdmin(`/users/${admin.id}`, { method: "DELETE" });
  assert.equal(self.status, 400);
  assert.equal(messageOf(self), "No puedes eliminar tu propia cuenta.");

  const doomed = await createUser(api.prisma, { pending: true });
  assert.equal((await asAdmin(`/users/${doomed.id}`, { method: "DELETE" })).status, 204);
  const gone = await asAdmin(`/users/${doomed.id}`);
  assert.equal(gone.status, 404);
  assert.equal(messageOf(gone), "Usuario no encontrado.");
});
