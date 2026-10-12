import { FlatCompat } from '@eslint/eslintrc';
import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
  resolvePluginsRelativeTo: path.dirname(require.resolve('eslint-config-next/package.json')),
});

const config = [
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  { ignores: ['.next/**', 'next-env.d.ts'] },
];

export default config;
