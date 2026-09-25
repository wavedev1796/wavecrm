import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  ValidateBy,
} from 'class-validator';
import { isCedula, isRuc, normalizeDigits, normalizePhone, officialProvince, PROVINCES } from './ecuador';

// Mismas reglas y mensajes que apps/web/lib/validation.ts, apps/web/lib/password-rules.ts y apps/web/lib/ecuador.ts.
// Ambos lados se prueban con test/casos-de-validacion.json para que no se separen.
// Los decoradores se validan en el orden en que se listan (con stopAtFirstError, un mensaje por campo).

export const EMAIL_PATTERN =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const NAME_PATTERN = /^\p{L}[\p{L}\p{M} '’.-]*$/u;
const NEW_PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!-/:-@[-`{-~]).*$/;

const EMAIL_INVALID = 'Escribe un correo válido, por ejemplo nombre@empresa.ec.';
const LOGIN_PASSWORD_REQUIRED = 'Ingresa tu contraseña.';
const NEW_PASSWORD_LENGTH = 'La contraseña debe tener entre 8 y 16 caracteres.';

export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ');

const normalized = (normalize: (value: string) => string) =>
  Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? normalize(value) : value));

export const IsAccountEmail = () =>
  applyDecorators(
    normalized(normalizeEmail),
    IsString({ message: EMAIL_INVALID }),
    IsNotEmpty({ message: 'Ingresa tu correo.' }),
    MaxLength(64, { message: 'El correo no puede superar 64 caracteres.' }),
    Matches(EMAIL_PATTERN, { message: EMAIL_INVALID }),
  );

/** `label` nombra el campo del mensaje: `IsPersonName('apellido')` dice "Ingresa el apellido." */
export const IsPersonName = (label = 'nombre') =>
  applyDecorators(
    normalized(normalizeName),
    IsString({ message: `Ingresa el ${label}.` }),
    IsNotEmpty({ message: `Ingresa el ${label}.` }),
    Length(2, 100, { message: `El ${label} debe tener entre 2 y 100 caracteres.` }),
    Matches(NAME_PATTERN, { message: `El ${label} solo puede tener letras, espacios, apóstrofos, guiones y puntos.` }),
  );

/** Sin reglas de composición: las cuentas creadas antes deben poder entrar. */
export const IsLoginPassword = () =>
  applyDecorators(
    IsString({ message: LOGIN_PASSWORD_REQUIRED }),
    IsNotEmpty({ message: LOGIN_PASSWORD_REQUIRED }),
    MaxLength(16, { message: 'La contraseña no puede superar 16 caracteres.' }),
  );

export const IsNewPassword = () =>
  applyDecorators(
    IsString({ message: NEW_PASSWORD_LENGTH }),
    Length(8, 16, { message: NEW_PASSWORD_LENGTH }),
    Matches(NEW_PASSWORD_PATTERN, {
      message: 'La contraseña debe incluir una mayúscula, una minúscula, un número y un carácter especial.',
    }),
  );

// Contactos y empresas (Sprint 2 / Ticket 12). Todos opcionales: los usa la importación (CRM-16) y los usará CRM-13.

const TAG_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N} -]*$/u;
const PHONE_INVALID = 'Escribe un teléfono de Ecuador, por ejemplo 0991234567 o 022345678.';
const CITY_LENGTH = 'La ciudad debe tener entre 2 y 60 caracteres.';

/** Un texto vacío llega como `null`: IsOptional lo deja pasar, un alta guarda NULL y un PATCH puede borrar el valor. */
const optional = (normalize: (value: string) => string) =>
  applyDecorators(
    Transform(({ value }: { value: unknown }) => {
      if (typeof value !== 'string') return value;
      return value.trim() ? normalize(value) : null;
    }),
    IsOptional(),
  );

/** Regla propia sobre el texto ya normalizado. */
const passes = (name: string, check: (value: string) => boolean, message: string) =>
  ValidateBy({ name, validator: { validate: (value: unknown) => typeof value === 'string' && check(value) } }, { message });

export const IsCedula = () =>
  applyDecorators(
    optional(normalizeDigits),
    Matches(/^\d{10}$/, { message: 'La cédula debe tener 10 dígitos.' }),
    passes('isCedula', isCedula, 'La cédula no es válida.'),
  );

export const IsRuc = () =>
  applyDecorators(
    optional(normalizeDigits),
    Matches(/^\d{13}$/, { message: 'El RUC debe tener 13 dígitos.' }),
    passes('isRuc', isRuc, 'El RUC no es válido.'),
  );

/** Correo de un contacto o empresa: opcional y sin el "tu" del correo de la cuenta. */
export const IsContactEmail = () =>
  applyDecorators(
    optional(normalizeEmail),
    IsString({ message: EMAIL_INVALID }),
    MaxLength(64, { message: 'El correo no puede superar 64 caracteres.' }),
    Matches(EMAIL_PATTERN, { message: EMAIL_INVALID }),
  );

/** Se guarda en E.164 (`+593…`); lo que no es un teléfono de Ecuador queda como llegó y no pasa. */
export const IsEcuadorPhone = () =>
  applyDecorators(
    optional((value) => normalizePhone(value) ?? value),
    passes('isEcuadorPhone', (value) => normalizePhone(value) === value, PHONE_INVALID),
  );

export const IsProvince = () =>
  applyDecorators(
    optional((value) => officialProvince(value) ?? value),
    IsIn(PROVINCES, { message: 'Elige una provincia de Ecuador.' }),
  );

export const IsCity = () =>
  applyDecorators(
    optional(normalizeName),
    IsString({ message: CITY_LENGTH }),
    Length(2, 60, { message: CITY_LENGTH }),
    Matches(NAME_PATTERN, { message: 'La ciudad solo puede tener letras, espacios, apóstrofos, guiones y puntos.' }),
  );

export const IsPosition = () =>
  applyDecorators(optional(normalizeName), MaxLength(100, { message: 'El cargo no puede superar 100 caracteres.' }));

/** Lista o texto separado por comas o punto y coma (la celda de un CSV), en minúsculas y sin repetidos. */
export const IsTags = () =>
  applyDecorators(
    Transform(({ value }: { value: unknown }) => normalizeTags(value)),
    IsOptional(),
    IsArray({ message: 'Escribe las etiquetas separadas por comas.' }),
    ArrayMaxSize(10, { message: 'Puedes asignar hasta 10 etiquetas.' }),
    Length(2, 30, { each: true, message: 'Cada etiqueta debe tener entre 2 y 30 caracteres.' }),
    Matches(TAG_PATTERN, { each: true, message: 'Las etiquetas solo pueden tener letras, números, espacios y guiones.' }),
  );

/** Vacío o `null` → `[]`: la columna no admite NULL y un PATCH con `[]` borra las etiquetas. */
function normalizeTags(value: unknown) {
  const list = typeof value === 'string' ? value.split(/[,;]/) : (value ?? []);
  if (!Array.isArray(list)) return value;
  const tags = list.map((tag: unknown) => (typeof tag === 'string' ? normalizeName(tag).toLowerCase() : tag));
  return [...new Set(tags.filter((tag) => tag !== ''))];
}
