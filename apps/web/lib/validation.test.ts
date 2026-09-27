// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { passwordError } from './password-rules';
import {
  companyNameError,
  emailError,
  fieldErrors,
  loginPasswordError,
  nameError,
  normalizeEmail,
  normalizeName,
  optionalEmailError,
  optionalLengthError,
  parseTags,
  roleError,
  tagsError,
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

test('nameError nombra el campo que valida', () => {
  expect(nameError('', 'apellido')).toBe('Ingresa el apellido.');
  expect(nameError('L', 'apellido')).toBe('El apellido debe tener entre 2 y 100 caracteres.');
  expect(nameError('L0pez', 'apellido')).toBe('El apellido solo puede tener letras, espacios, apóstrofos, guiones y puntos.');
});

test('fieldErrors deja solo los campos con error', () => {
  expect(fieldErrors({ email: null, password: 'Ingresa tu contraseña.' })).toEqual({
    password: 'Ingresa tu contraseña.',
  });
  expect(fieldErrors({ email: null, password: null })).toBeNull();
});

test('nombre comercial y razón social siguen las reglas del API', () => {
  expect(companyNameError('', { required: true })).toBe('Ingresa el nombre.');
  expect(companyNameError('A', { required: true })).toBe('El nombre debe tener entre 2 y 120 caracteres.');
  expect(companyNameError('Wave & Co. (EC)', { required: true })).toBeNull();
  expect(companyNameError('Wave <script>', { required: true })).toBe(
    'El nombre solo puede tener letras, números y signos comerciales comunes.',
  );
  expect(companyNameError('', { required: false })).toBeNull();
  expect(companyNameError('x'.repeat(161), { required: false })).toBe('La razón social no puede superar 160 caracteres.');
});

test('correo opcional, etiquetas y longitud opcional compartidos por contactos y empresas', () => {
  expect(optionalEmailError('')).toBeNull();
  expect(optionalEmailError('ana@empresa')).toBe('Escribe un correo válido, por ejemplo nombre@empresa.ec.');
  expect(parseTags(' Cliente; VIP, cliente ')).toEqual(['cliente', 'vip']);
  expect(tagsError('vip!')).toBe('Las etiquetas solo pueden tener letras, números, espacios y guiones.');
  expect(optionalLengthError('Q', 'La ciudad', 2, 60)).toBe('La ciudad debe tener entre 2 y 60 caracteres.');
  expect(optionalLengthError('', 'La ciudad', 2, 60)).toBeNull();
});
