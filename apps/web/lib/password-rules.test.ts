// @vitest-environment node
import { expect, test } from 'vitest';
import { confirmationError, passwordChecks } from './password-rules';

const met = (value: string) => Object.fromEntries(passwordChecks(value).map((check) => [check.id, check.met]));

test('una contraseña vacía no cumple ninguna regla', () => {
  expect(met('')).toEqual({ length: false, upper: false, lower: false, number: false, special: false });
});

test('Wave2026! cumple las cinco reglas', () => {
  expect(met('Wave2026!')).toEqual({ length: true, upper: true, lower: true, number: true, special: true });
});

test('la longitud va de 8 a 16 caracteres', () => {
  expect(met('Ab1!xyz').length).toBe(false);
  expect(met('Ab1!xyzw').length).toBe(true);
  expect(met('Ab1!xyzwAb1!xyzw').length).toBe(true);
  expect(met('Ab1!xyzwAb1!xyzwA').length).toBe(false);
});

test('la ñ y las tildes no cuentan como mayúscula ni minúscula, igual que en el API', () => {
  expect(met('ÑÁ').upper).toBe(false);
  expect(met('ñá').lower).toBe(false);
});

test('los 32 símbolos ASCII cuentan como carácter especial; el espacio no', () => {
  for (const symbol of '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~') expect(met(symbol).special, symbol).toBe(true);
  expect(met(' ').special).toBe(false);
});

test('las etiquetas se muestran en orden fijo', () => {
  expect(passwordChecks('').map((check) => check.label)).toEqual([
    'Entre 8 y 16 caracteres',
    'Una mayúscula',
    'Una minúscula',
    'Un número',
    'Un carácter especial (!@#$…)',
  ]);
});

test('la confirmación es obligatoria y debe coincidir', () => {
  expect(confirmationError('Wave2026!', '')).toBe('Confirma tu contraseña.');
  expect(confirmationError('Wave2026!', 'Wave2026?')).toBe('Las contraseñas no coinciden.');
  expect(confirmationError('Wave2026!', 'Wave2026!')).toBeNull();
});
