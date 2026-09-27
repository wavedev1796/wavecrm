// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { COUNTRIES, countryOrEcuador, formatPhone, phoneError, splitPhone, type CountryCode } from './phone';

type Caso = { valor: string; pais?: CountryCode; error: string | null };
const casos = JSON.parse(readFileSync(new URL('../../../test/casos-de-validacion.json', import.meta.url), 'utf8')) as {
  telefono: Caso[];
};

test('la web cumple los casos compartidos de teléfono', () => {
  for (const { valor, pais, error } of casos.telefono) {
    expect(phoneError(valor, pais), `${pais ?? 'EC'} ${valor}`).toBe(error);
  }
});

test('países, edición y formato', () => {
  expect(COUNTRIES.find(({ code }) => code === 'CO')?.label).toBe('Colombia (+57)');
  expect(COUNTRIES.find(({ code }) => code === 'EC')?.label).toBe('Ecuador (+593)');
  expect(countryOrEcuador('XX')).toBe('EC');
  expect(countryOrEcuador('CO')).toBe('CO');
  expect(splitPhone('+576012345678')).toEqual({ country: 'CO', national: '(601) 2345678' });
  expect(splitPhone(null)).toEqual({ country: 'EC', national: '' });
  expect(formatPhone('+593991234567')).toBe('+593 99 123 4567');
});
