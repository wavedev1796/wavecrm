import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Length, Matches, MaxLength } from 'class-validator';

// Mismas reglas y mensajes que apps/web/lib/validation.ts y apps/web/lib/password-rules.ts.
// Ambos lados se prueban con test/casos-de-validacion.json para que no se separen.
// Los decoradores se validan en el orden en que se listan (con stopAtFirstError, un mensaje por campo).

export const EMAIL_PATTERN =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const NAME_PATTERN = /^\p{L}[\p{L}\p{M} '’.-]*$/u;
const NEW_PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!-/:-@[-`{-~]).*$/;

const EMAIL_INVALID = 'Escribe un correo válido, por ejemplo nombre@empresa.ec.';
const NAME_REQUIRED = 'Ingresa el nombre.';
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

export const IsPersonName = () =>
  applyDecorators(
    normalized(normalizeName),
    IsString({ message: NAME_REQUIRED }),
    IsNotEmpty({ message: NAME_REQUIRED }),
    Length(2, 100, { message: 'El nombre debe tener entre 2 y 100 caracteres.' }),
    Matches(NAME_PATTERN, { message: 'El nombre solo puede tener letras, espacios, apóstrofos, guiones y puntos.' }),
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
