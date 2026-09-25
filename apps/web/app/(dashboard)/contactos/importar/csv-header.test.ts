// @vitest-environment node
import { expect, test } from "vitest";
import { guessMapping, readCsvHeader } from "./csv-header";

const BOM = String.fromCharCode(0xfeff);

test("lee la cabecera con coma o punto y coma, comillas y BOM", async () => {
  expect(
    await readCsvHeader(
      new Blob([`${BOM}Nombre,Apellido,"Correo, trabajo"\nAna,López,a@b.ec`]),
    ),
  ).toEqual(["Nombre", "Apellido", "Correo, trabajo"]);
  expect(
    await readCsvHeader(new Blob([' Nombre ;"Apellido";Notas\r\nAna;López;x'])),
  ).toEqual(["Nombre", "Apellido", "Notas"]);
});

test("lee Windows-1252 cuando el archivo no es UTF-8 (CSV de Excel en español)", async () => {
  expect(
    await readCsvHeader(
      new Blob([
        new Uint8Array([0x43, 0xe9, 0x64, 0x75, 0x6c, 0x61, 0x3b, 0x4e]),
      ]),
    ),
  ).toEqual(["Cédula", "N"]);
});

test("propone la columna de cada campo sin importar tildes ni mayúsculas", () => {
  expect(
    guessMapping([
      "NOMBRES",
      "Apellido",
      "Cedula",
      "Correo electrónico",
      "Celular",
      "RUC empresa",
      "Notas",
    ]),
  ).toEqual({
    firstName: "NOMBRES",
    lastName: "Apellido",
    documentId: "Cedula",
    email: "Correo electrónico",
    phone: "Celular",
    companyTaxId: "RUC empresa",
  });
});
