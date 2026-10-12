import { FlatCompat } from '@eslint/eslintrc';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  resolvePluginsRelativeTo: path.dirname(require.resolve('eslint-config-next/package.json')),
});

// Dirección de las dependencias: app → components / content / lib. Nada fuera de app/ importa una ruta.
const SIN_APP = {
  group: ['@/app/**'],
  message: 'app/ solo tiene rutas. Lo que se comparte va en components/, content/ o lib/.',
};

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { ignores: ['.next/**', 'next-env.d.ts'] },
  {
    files: ['components/**/*.{ts,tsx}', 'content/**/*.ts', 'lib/**/*.ts'],
    // Las pruebas del importador usan los fields.ts reales de cada ruta como datos.
    ignores: ['**/*.test.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [SIN_APP] }] },
  },
];

export default config;
