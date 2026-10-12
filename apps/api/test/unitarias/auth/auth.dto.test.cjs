const { test } = require("node:test");
const assert = require("node:assert/strict");
const { plainToInstance } = require("class-transformer");
const { validate } = require("class-validator");
const { ForgotPasswordDto, RefreshTokenDto, ResetPasswordDto } = require("../../../dist/modules/auth/auth.dto.js");

async function errors(Dto, body) {
  const result = await validate(plainToInstance(Dto, body), { stopAtFirstError: true });
  return Object.fromEntries(result.map((error) => [error.property, Object.values(error.constraints)[0]]));
}

test("recuperar contraseña valida el correo", async () => {
  assert.deepEqual(await errors(ForgotPasswordDto, { email: "ana@empresa.ec" }), {});
  assert.ok((await errors(ForgotPasswordDto, { email: "ana" })).email);
});

test("restablecer contraseña exige contraseña nueva y su confirmación", async () => {
  assert.deepEqual(await errors(ResetPasswordDto, { password: "Wave2026!", passwordConfirmation: "Wave2026!" }), {});
  const result = await errors(ResetPasswordDto, { password: "Wave2026!", passwordConfirmation: "" });
  assert.equal(result.passwordConfirmation, "Confirma tu contraseña.");
});

test("el refresh token vacío o demasiado largo no es válido", async () => {
  for (const refreshToken of ["", "x".repeat(2049), 5]) {
    assert.equal((await errors(RefreshTokenDto, { refreshToken })).refreshToken, "El refresh token no es válido.");
  }
});
