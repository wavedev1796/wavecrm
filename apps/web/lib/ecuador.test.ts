// @vitest-environment node
import { readFileSync } from 'node:fs';
import { expect, test } from 'vitest';
import { cedulaError, normalizeDigits, officialProvince, provinceError, rucError } from './ecuador';

type Caso = { valor: string; error: string | null };

const reglas = {
  cedula: (valor: string) => cedulaError(normalizeDigits(valor)),
  ruc: (valor: string) => rucError(normalizeDigits(valor)),
  provincia: provinceError,
};

const casos = JSON.parse(
  readFileSync(new URL('../../../test/casos-de-validacion.json', import.meta.url), 'utf8'),
) as Record<keyof typeof reglas, Caso[]>;

test.each(Object.keys(reglas) as (keyof typeof reglas)[])('la web cumple los casos compartidos de "%s"', (campo) => {
  for (const { valor, error } of casos[campo]) expect(reglas[campo](valor), JSON.stringify(valor)).toBe(error);
});

test('normaliza la provincia igual que el API', () => {
  expect(officialProvince('santo domingo de los tsachilas')).toBe('Santo Domingo de los Tsáchilas');
});
