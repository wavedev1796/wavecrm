import { FlatCompat } from '@eslint/eslintrc';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  resolvePluginsRelativeTo: path.dirname(require.resolve('eslint-config-next/package.json')),
});

// Direccion de dependencias: app -> features -> components / content / lib.
const SIN_APP = {
  group: ['@/app/**'],
  message: 'app/ solo tiene rutas. Importa desde features/, components/, content/ o lib/.',
};
const SIN_FEATURES = {
  group: ['@/features/**'],
  message: 'components/, content/ y lib/ no dependen de features/.',
};

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { ignores: ['.next/**', '.next-pipeline-test/**', 'next-env.d.ts'] },
  {
    files: ['features/**/*.{ts,tsx}'],
    rules: { 'no-restricted-imports': ['error', { patterns: [SIN_APP] }] },
  },
  {
    files: ['components/**/*.{ts,tsx}', 'content/**/*.ts', 'lib/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [SIN_APP, SIN_FEATURES] }] },
  },
];

export default config;
