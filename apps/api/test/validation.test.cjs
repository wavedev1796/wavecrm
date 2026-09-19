const { test } = require("node:test");
const assert = require("node:assert/strict");
const { plainToInstance } = require("class-transformer");
const { validate } = require("class-validator");
const casos = require("../../../test/casos-de-validacion.json");
const { LoginDto, RefreshTokenDto } = require("../dist/modules/auth/auth.dto.js");
const { ActivateInvitationDto, CreateUserDto, ListUsersDto } = require("../dist/modules/users/users.dto.js");

/** Primer mensaje del campo, con las mismas opciones que el ValidationPipe global. */
async function firstError(Dto, body, property) {
  const errors = await validate(plainToInstance(Dto, body), {
    stopAtFirstError: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  const error = errors.find((item) => item.property === property);
  return error ? Object.values(error.constraints)[0] : null;
}

const validUser = { name: "Ana López", email: "ana@empresa.ec", role: "VENDEDOR" };

for (const [caso, Dto, property, base] of [
  ["email", LoginDto, "email", { password: "x" }],
  ["contrasenaLogin", LoginDto, "password", { email: "ana@empresa.ec" }],
  ["email", CreateUserDto, "email", validUser],
  ["nombre", CreateUserDto, "name", validUser],
  ["rol", CreateUserDto, "role", validUser],
  ["contrasenaNueva", ActivateInvitationDto, "password", { passwordConfirmation: "x" }],
]) {
  test(`${Dto.name}.${property} cumple los casos compartidos de "${caso}"`, async () => {
    for (const { valor, error } of casos[caso]) {
      assert.equal(await firstError(Dto, { ...base, [property]: valor }, property), error, JSON.stringify(valor));
    }
  });
}

test("los DTOs normalizan correo y nombre antes de usarlos", () => {
  assert.equal(plainToInstance(LoginDto, { email: " Ana@Empresa.EC ", password: "x" }).email, "ana@empresa.ec");
  const user = plainToInstance(CreateUserDto, { name: "  María   José ", email: "A@B.EC", role: "ADMIN" });
  assert.equal(user.name, "María José");
  assert.equal(user.email, "a@b.ec");
});

test("filtros y paginación explican el error en español", async () => {
  for (const [query, property, message] of [
    [{ page: "abc" }, "page", "La página debe ser un número entero mayor que 0."],
    [{ page: "0" }, "page", "La página debe ser un número entero mayor que 0."],
    [{ limit: "500" }, "limit", "El límite debe ser un número entero entre 1 y 100."],
    [{ limit: "0" }, "limit", "El límite debe ser un número entero entre 1 y 100."],
    [{ search: "x".repeat(101) }, "search", "La búsqueda no puede superar 100 caracteres."],
    [{ search: ["a", "b"] }, "search", "La búsqueda debe ser un texto."],
    [{ status: "borrado" }, "status", "Elige un estado válido."],
    [{ role: "ROOT" }, "role", "Elige un rol válido."],
  ]) {
    assert.equal(await firstError(ListUsersDto, query, property), message, JSON.stringify(query));
  }
  const ok = { page: "2", limit: "10", search: " ana ", status: "active", role: "ADMIN" };
  for (const property of Object.keys(ok)) assert.equal(await firstError(ListUsersDto, ok, property), null);
});

test("confirmación de contraseña y refresh token son obligatorios y acotados", async () => {
  assert.equal(
    await firstError(ActivateInvitationDto, { password: "Wave2026!", passwordConfirmation: "" }, "passwordConfirmation"),
    "Confirma tu contraseña.",
  );
  assert.equal(await firstError(RefreshTokenDto, { refreshToken: "" }, "refreshToken"), "El refresh token no es válido.");
  assert.equal(
    await firstError(RefreshTokenDto, { refreshToken: "x".repeat(2049) }, "refreshToken"),
    "El refresh token no es válido.",
  );
});
