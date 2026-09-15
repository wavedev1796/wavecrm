import assert from 'node:assert/strict';
import test from 'node:test';
import { passwordChecks } from './password-rules.ts';

const met = (value) =>
  Object.fromEntries(passwordChecks(value).map((check) => [check.id, check.met]));

test('una contraseña vacía no cumple ninguna regla', () => {
  assert.deepEqual(met(''), { length: false, letter: false, number: false });
});

test('letras y números con 8 caracteres cumplen las tres reglas', () => {
  assert.deepEqual(met('wave2026'), { length: true, letter: true, number: true });
});

test('solo letras o solo números no bastan', () => {
  assert.deepEqual(met('abcdefgh'), { length: true, letter: true, number: false });
  assert.deepEqual(met('12345678'), { length: true, letter: false, number: true });
});

test('7 caracteres no alcanzan la longitud mínima', () => {
  assert.equal(met('wave202').length, false);
});

test('la ñ no cuenta como letra, igual que la regex del API', () => {
  assert.equal(met('ññññññ12').letter, false);
});

test('las etiquetas se muestran en orden fijo', () => {
  assert.deepEqual(
    passwordChecks('').map((check) => check.label),
    ['Al menos 8 caracteres', 'Una letra', 'Un número'],
  );
});
