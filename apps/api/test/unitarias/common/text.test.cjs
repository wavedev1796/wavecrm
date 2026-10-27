const { test } = require("node:test");
const assert = require("node:assert/strict");
const { cleanText } = require("@wave/shared");

test("una línea: recorta, junta los espacios y quita controles, invisibles y marcas bidi", () => {
  assert.equal(cleanText("  Web \t corporativa\n 2026  "), "Web corporativa 2026");
  assert.equal(cleanText("Ho\u0000la\u0007 mun​do﻿"), "Hola mundo");
  assert.equal(cleanText("‮odnum‬⁦x⁩­"), "odnumx");
  assert.equal(cleanText("\u{E0041}\u{E0042}ok"), "ok");
  assert.equal(cleanText(" solo "), "solo");
});

test("compone Unicode (NFC), conserva tildes y emojis y quita sustitutos sueltos", () => {
  assert.equal(cleanText("Cotización"), "Cotización");
  assert.equal(cleanText("Ñandú 😀"), "Ñandú 😀");
  assert.equal(cleanText("a\uD800b\uDC00c"), "abc");
});

test("no toca el HTML: se escapa al pintar, no al guardar", () => {
  assert.equal(cleanText("<b>Oferta</b> < 5 mil & más"), "<b>Oferta</b> < 5 mil & más");
});

test("varias líneas: conserva los saltos, sin espacios al borde ni más de una línea en blanco", () => {
  assert.equal(cleanText("  uno  \r\n  dos\r\r\r\n\n\n\n tres \t cuatro ", true), "uno\ndos\n\ntres cuatro");
  assert.equal(cleanText("a\u0000\n​b", true), "a\nb");
  assert.equal(cleanText(" \n ​ \n ", true), "");
});
