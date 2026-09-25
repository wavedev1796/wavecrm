const { test } = require("node:test");
const assert = require("node:assert/strict");
const { plainToInstance } = require("class-transformer");
const { validate } = require("class-validator");
const casos = require("../../../test/casos-de-validacion.json");
const { LoginDto, RefreshTokenDto } = require("../dist/modules/auth/auth.dto.js");
const { ActivateInvitationDto, CreateUserDto, ListUsersDto } = require("../dist/modules/users/users.dto.js");
const { ContactImportRowDto } = require("../dist/modules/contact-import/contact-import.dto.js");

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
const validRow = { firstName: "Ana", lastName: "López" };

for (const [caso, Dto, property, base] of [
  ["email", LoginDto, "email", { password: "x" }],
  ["contrasenaLogin", LoginDto, "password", { email: "ana@empresa.ec" }],
  ["email", CreateUserDto, "email", validUser],
  ["nombre", CreateUserDto, "name", validUser],
  ["rol", CreateUserDto, "role", validUser],
  ["contrasenaNueva", ActivateInvitationDto, "password", { passwordConfirmation: "x" }],
  ["nombre", ContactImportRowDto, "firstName", validRow],
  ["cedula", ContactImportRowDto, "documentId", validRow],
  ["ruc", ContactImportRowDto, "companyTaxId", validRow],
  ["telefono", ContactImportRowDto, "phone", validRow],
  ["provincia", ContactImportRowDto, "province", validRow],
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

test("una fila de contacto normaliza identificación, teléfono, provincia, ciudad y etiquetas", () => {
  const row = plainToInstance(ContactImportRowDto, {
    firstName: "  María   José ",
    lastName: "Cordero",
    documentId: "171234567-5",
    email: " Maria@Andina.EC ",
    phone: "099 123 4567",
    province: "pichincha",
    city: "  San   Rafael ",
    position: "",
    tags: "Cliente; mayorista, CLIENTE",
    companyTaxId: "   ",
  });
  assert.deepEqual(
    { ...row },
    {
      firstName: "María José",
      lastName: "Cordero",
      documentId: "1712345675",
      email: "maria@andina.ec",
      phone: "+593991234567",
      province: "Pichincha",
      city: "San Rafael",
      position: null,
      tags: ["cliente", "mayorista"],
      companyTaxId: null,
    },
  );
});

test("apellido, correo, ciudad y cargo de un contacto explican su error", async () => {
  for (const [property, value, message] of [
    ["lastName", "", "Ingresa el apellido."],
    ["lastName", "L", "El apellido debe tener entre 2 y 100 caracteres."],
    ["lastName", "L0pez", "El apellido solo puede tener letras, espacios, apóstrofos, guiones y puntos."],
    ["email", "", null],
    ["email", "ana@empresa", "Escribe un correo válido, por ejemplo nombre@empresa.ec."],
    ["email", `${"a".repeat(55)}@empresa.ec`, "El correo no puede superar 64 caracteres."],
    ["city", "Q", "La ciudad debe tener entre 2 y 60 caracteres."],
    ["city", "Quito 2", "La ciudad solo puede tener letras, espacios, apóstrofos, guiones y puntos."],
    ["position", "x".repeat(101), "El cargo no puede superar 100 caracteres."],
    ["position", "Gerente de TI", null],
  ]) {
    assert.equal(
      await firstError(ContactImportRowDto, { ...validRow, [property]: value }, property),
      message,
      `${property}=${value}`,
    );
  }
});

test("etiquetas: hasta 10, de 2 a 30 caracteres, con letras, números, espacios y guiones", async () => {
  for (const [tags, message] of [
    [Array.from({ length: 11 }, (_, index) => `tag ${index}`), "Puedes asignar hasta 10 etiquetas."],
    ["a", "Cada etiqueta debe tener entre 2 y 30 caracteres."],
    ["x".repeat(31), "Cada etiqueta debe tener entre 2 y 30 caracteres."],
    ["vip!", "Las etiquetas solo pueden tener letras, números, espacios y guiones."],
    [5, "Escribe las etiquetas separadas por comas."],
    ["vip, zona-norte, 2026", null],
    ["", null],
  ]) {
    assert.equal(await firstError(ContactImportRowDto, { ...validRow, tags }, "tags"), message, JSON.stringify(tags));
  }
  assert.deepEqual(plainToInstance(ContactImportRowDto, { ...validRow, tags: "" }).tags, []);
});
