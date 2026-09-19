// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { passwordError } from './password-rules';
import {
  emailError,
  fieldErrors,
  loginPasswordError,
  nameError,
  normalizeEmail,
  normalizeName,
  roleError,
} from './validation';

type Caso = { valor: string; error: string | null };

const reglas = {
  email: (valor: string) => emailError(normalizeEmail(valor)),
  nombre: (valor: string) => nameError(normalizeName(valor)),
  contrasenaLogin: loginPasswordError,
  contrasenaNueva: passwordError,
  rol: roleError,
};

const casos = JSON.parse(
  readFileSync(new URL('../../../test/casos-de-validacion.json', import.meta.url), 'utf8'),
) as Record<keyof typeof reglas, Caso[]>;

test.each(Object.keys(reglas) as (keyof typeof reglas)[])('la web cumple los casos compartidos de "%s"', (campo) => {
  for (const { valor, error } of casos[campo]) expect(reglas[campo](valor), JSON.stringify(valor)).toBe(error);
});

test('normaliza correo y nombre igual que el API', () => {
  expect(normalizeEmail(' Ana@Empresa.EC ')).toBe('ana@empresa.ec');
  expect(normalizeName('  María   José ')).toBe('María José');
});

test('fieldErrors deja solo los campos con error', () => {
  expect(fieldErrors({ email: null, password: 'Ingresa tu contraseña.' })).toEqual({
    password: 'Ingresa tu contraseña.',
  });
  expect(fieldErrors({ email: null, password: null })).toBeNull();
});
