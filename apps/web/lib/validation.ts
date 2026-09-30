// Mismas reglas y mensajes que apps/api/src/common/validation.ts. Ambos lados se prueban con
// test/casos-de-validacion.json para que no se separen. La contraseña nueva vive en password-rules.ts.

export const EMAIL_MAX = 64;
export const NAME_MAX = 100;
export const SEARCH_MAX = 100;
export const LOGIN_PASSWORD_MAX = 16;

const EMAIL_PATTERN =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
const NAME_PATTERN = /^\p{L}[\p{L}\p{M} '’.-]*$/u;

/** Un campo del formulario como texto. Si llega un archivo o no llega nada, cuenta como vacío. */
export function formText(formData: FormData, field: string): string {
  const value = formData.get(field);
  return typeof value === 'string' ? value : '';
}

export const normalizeEmail = (value: string) => value.trim().toLowerCase();
export const normalizeName = (value: string) => value.trim().replace(/\s+/g, ' ');

/** Espera el correo ya normalizado. */
export function emailError(email: string): string | null {
  if (!email) return 'Ingresa tu correo.';
  if (email.length > EMAIL_MAX) return 'El correo no puede superar 64 caracteres.';
  return EMAIL_PATTERN.test(email) ? null : 'Escribe un correo válido, por ejemplo nombre@empresa.ec.';
}

/** Espera el nombre ya normalizado. `label` nombra el campo del mensaje: "apellido", por ejemplo. */
export function nameError(name: string, label = 'nombre'): string | null {
  if (!name) return `Ingresa el ${label}.`;
  if (name.length < 2 || name.length > NAME_MAX) return `El ${label} debe tener entre 2 y 100 caracteres.`;
  return NAME_PATTERN.test(name) ? null : `El ${label} solo puede tener letras, espacios, apóstrofos, guiones y puntos.`;
}

/** Sin reglas de composición: las cuentas creadas antes deben poder entrar. */
export function loginPasswordError(password: string): string | null {
  if (!password) return 'Ingresa tu contraseña.';
  return password.length > LOGIN_PASSWORD_MAX ? 'La contraseña no puede superar 16 caracteres.' : null;
}

export function roleError(role: string): string | null {
  return role === 'ADMIN' || role === 'VENDEDOR' ? null : 'Elige un rol válido.';
}

/** Deja solo los campos con error; `null` si no hay ninguno. */
export function fieldErrors<Field extends string>(
  checks: Record<Field, string | null>,
): Partial<Record<Field, string>> | null {
  const errors = Object.fromEntries(Object.entries(checks).filter(([, message]) => message));
  return Object.keys(errors).length ? (errors as Partial<Record<Field, string>>) : null;
}

// Contactos y empresas (ajustes del Sprint 2): mismas reglas que los decoradores del API.

/** Correo de un contacto o empresa: opcional. Espera el correo ya normalizado. */
export function optionalEmailError(value: string): string | null {
  if (!value) return null;
  if (value.length > EMAIL_MAX) return 'El correo no puede superar 64 caracteres.';
  return EMAIL_PATTERN.test(value) ? null : 'Escribe un correo válido, por ejemplo nombre@empresa.ec.';
}

/** Texto separado por comas o punto y coma → etiquetas en minúsculas y sin repetir. */
export function parseTags(value: string) {
  return [
    ...new Set(
      value
        .split(/[,;]/)
        .map((tag) => normalizeName(tag).toLowerCase())
        .filter(Boolean),
    ),
  ];
}

export function tagsError(value: string): string | null {
  const list = parseTags(value);
  if (list.length > 10) return 'Puedes asignar hasta 10 etiquetas.';
  if (list.some((tag) => tag.length < 2 || tag.length > 30)) return 'Cada etiqueta debe tener entre 2 y 30 caracteres.';
  return list.some((tag) => !/^[\p{L}\p{N}][\p{L}\p{N} -]*$/u.test(tag))
    ? 'Las etiquetas solo pueden tener letras, números, espacios y guiones.'
    : null;
}

/** Campo opcional con longitud acotada: `optionalLengthError(ciudad, 'La ciudad', 2, 60)`. */
export function optionalLengthError(value: string, label: string, min: number, max: number): string | null {
  return !value || (value.length >= min && value.length <= max) ? null : `${label} debe tener entre ${min} y ${max} caracteres.`;
}

const COMPANY_NAME_PATTERN = /^[\p{L}\p{N}][\p{L}\p{M}\p{N} &'’.,()/-]*$/u;

/** Nombre comercial (obligatorio, 2–120) o razón social (opcional, hasta 160), con las reglas de CreateCompanyDto. */
export function companyNameError(value: string, { required }: { required: boolean }): string | null {
  if (!value) return required ? 'Ingresa el nombre.' : null;
  if (required && (value.length < 2 || value.length > 120)) return 'El nombre debe tener entre 2 y 120 caracteres.';
  if (!required && value.length > 160) return 'La razón social no puede superar 160 caracteres.';
  return COMPANY_NAME_PATTERN.test(value) ? null : 'El nombre solo puede tener letras, números y signos comerciales comunes.';
}

export function websiteError(value: string): string | null {
  if (!value) return null;
  if (value.length > 200) return 'El sitio web no puede superar 200 caracteres.';
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? null
      : 'Escribe un sitio web válido con http:// o https://.';
  } catch {
    return 'Escribe un sitio web válido con http:// o https://.';
  }
}
