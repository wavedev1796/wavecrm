/** Reglas de `ActivateInvitationDto` en el API: mínimo 8 caracteres, una letra (A-Z) y un número. */
const RULES = [
  { id: 'length', label: 'Al menos 8 caracteres', test: (value: string) => value.length >= 8 },
  { id: 'letter', label: 'Una letra', test: (value: string) => /[A-Za-z]/.test(value) },
  { id: 'number', label: 'Un número', test: (value: string) => /\d/.test(value) },
] as const;

export type PasswordCheck = { id: (typeof RULES)[number]['id']; label: string; met: boolean };

export function passwordChecks(value: string): PasswordCheck[] {
  return RULES.map((rule) => ({ id: rule.id, label: rule.label, met: rule.test(value) }));
}
