const { test } = require("node:test");
const assert = require("node:assert/strict");
const { decodeCsv, detectDelimiter, parseCsv } = require("../dist/modules/contact-import/csv.js");

const BOM = String.fromCharCode(0xfeff);

test("separa por coma respetando comillas, comillas escapadas y saltos de línea", () => {
  assert.deepEqual(parseCsv('Nombre,Nota\r\n"Pérez, Ana","Dijo ""hola""\r\nadiós"\r\n'), [
    ["Nombre", "Nota"],
    ["Pérez, Ana", 'Dijo "hola"\nadiós'],
  ]);
});

test("usa punto y coma cuando la cabecera lo tiene (Excel en español)", () => {
  assert.equal(detectDelimiter("Nombre;Apellido;Etiquetas\nAna;López;a,b,c"), ";");
  assert.equal(detectDelimiter("Nombre,Apellido"), ",");
  assert.deepEqual(parseCsv("Nombre;Etiquetas\nAna;vip,norte"), [
    ["Nombre", "Etiquetas"],
    ["Ana", "vip,norte"],
  ]);
});

test("conserva celdas vacías, comillas vacías y comillas sueltas dentro de una celda", () => {
  assert.deepEqual(parseCsv('a,,c\n"",x"y,""""'), [
    ["a", "", "c"],
    ["", 'x"y', '"'],
  ]);
});

test("lee UTF-8 (con o sin BOM) y, si no es UTF-8, Windows-1252", () => {
  assert.equal(decodeCsv(Buffer.from(`${BOM}Cédula`, "utf8")), "Cédula");
  assert.equal(decodeCsv(Buffer.from("Cédula", "latin1")), "Cédula");
});

test("una comilla sin cerrar es un formato inválido", () => {
  assert.throws(() => parseCsv('Nombre\n"Ana'), { message: "El archivo CSV no tiene un formato válido." });
});
