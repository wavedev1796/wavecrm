const { test } = require("node:test");
const assert = require("node:assert/strict");
const { BadRequestException, HttpException, NotFoundException } = require("@nestjs/common");
const { validationException } = require("../dist/app.setup.js");
const { GlobalExceptionFilter } = require("../dist/common/filters/global-exception.filter.js");

function respond(exception) {
  const sent = {};
  const response = {
    status(code) {
      sent.status = code;
      return this;
    },
    json(body) {
      sent.body = body;
    },
  };
  const host = {
    switchToHttp: () => ({ getResponse: () => response, getRequest: () => ({ url: "/api/v1/prueba" }) }),
  };
  new GlobalExceptionFilter().catch(exception, host);
  return sent;
}

test("un campo no permitido se explica en español y se conserva el resto de mensajes", () => {
  const error = validationException([
    { property: "rol", constraints: { whitelistValidation: "property rol should not exist" } },
    { property: "email", constraints: { matches: "Escribe un correo válido, por ejemplo nombre@empresa.ec." } },
  ]);
  assert.ok(error instanceof BadRequestException);
  assert.deepEqual(error.getResponse().message, [
    "El campo «rol» no está permitido.",
    "Escribe un correo válido, por ejemplo nombre@empresa.ec.",
  ]);
});

test("JSON roto y rutas mal codificadas responden 400 con un mensaje claro", () => {
  for (const technical of [
    "Unexpected end of JSON input",
    "Expected property name or '}' in JSON at position 1 (line 1 column 2)",
    "Failed to decode param '%E0%A4%A'",
  ]) {
    const { status, body } = respond(new BadRequestException(technical));
    assert.equal(status, 400);
    assert.equal(body.error.message, "La solicitud no tiene un formato válido.");
    assert.equal(body.error.path, "/api/v1/prueba");
  }
});

test("un cuerpo demasiado grande responde 413, no 500", () => {
  const tooLarge = Object.assign(new Error("request entity too large"), { type: "entity.too.large", status: 413 });
  const { status, body } = respond(tooLarge);
  assert.equal(status, 413);
  assert.equal(body.error.message, "La solicitud es demasiado grande.");
});

test("conserva los mensajes propios y oculta los errores internos", () => {
  assert.equal(
    respond(new BadRequestException("Las contraseñas no coinciden.")).body.error.message,
    "Las contraseñas no coinciden.",
  );
  assert.deepEqual(respond(new BadRequestException(["Ingresa tu correo."])).body.error.message, ["Ingresa tu correo."]);
  assert.equal(respond(new NotFoundException("Usuario no encontrado.")).status, 404);
  assert.equal(respond(new HttpException("Texto propio", 418)).body.error.message, "Texto propio");
  const internal = respond(new Error("connect ECONNREFUSED"));
  assert.equal(internal.status, 500);
  assert.equal(internal.body.error.message, "Ocurrió un error inesperado.");
});
