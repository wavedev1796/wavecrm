/**
 * Reglas de contraseña nueva, iguales a `IsNewPassword` del API (apps/api/src/common/validation.ts).
 * Solo cuentan las letras A-Z/a-z y los símbolos ASCII; la ñ, las tildes y el espacio se permiten sin sumar.
 */
const SPECIAL = /[!-/:-@[-`{-~]/;
const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 16;

const RULES = [
  {
    id: 'length',
    label: 'Entre 8 y 16 caracteres',
    test: (value: string) => value.length >= PASSWORD_MIN && value.length <= PASSWORD_MAX,
  },
  { id: 'upper', label: 'Una mayúscula', test: (value: string) => /[A-Z]/.test(value) },
  { id: 'lower', label: 'Una minúscula', test: (value: string) => /[a-z]/.test(value) },
  { id: 'number', label: 'Un número', test: (value: string) => /\d/.test(value) },
  { id: 'special', label: 'Un carácter especial (!@#$…)', test: (value: string) => SPECIAL.test(value) },
] as const;

export type PasswordCheck = { id: (typeof RULES)[number]['id']; label: string; met: boolean };

export function passwordChecks(value: string): PasswordCheck[] {
  return RULES.map((rule) => ({ id: rule.id, label: rule.label, met: rule.test(value) }));
}

/** Primer error de la contraseña nueva, con los mismos textos que el API; `null` si es válida. */
export function passwordError(value: string): string | null {
  const [length, ...composition] = passwordChecks(value);
  if (!length?.met) return 'La contraseña debe tener entre 8 y 16 caracteres.';
  return composition.every((check) => check.met)
    ? null
    : 'La contraseña debe incluir una mayúscula, una minúscula, un número y un carácter especial.';
}

/** Error de la confirmación; la usan la server action y el aviso en vivo del formulario. */
export function confirmationError(password: string, confirmation: string): string | null {
  if (!confirmation) return 'Confirma tu contraseña.';
  return confirmation === password ? null : 'Las contraseñas no coinciden.';
}
