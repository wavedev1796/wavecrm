import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

const fromHere = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  // tsconfig usa "jsx": "preserve" para Next; en las pruebas es Vite (oxc) quien transforma el JSX.
  oxc: { jsx: { runtime: 'automatic' } },
  resolve: { alias: { '@': fromHere('./') } },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: ['**/*.test.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**'],
    mockReset: true,
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      include: ['app/**/*.{ts,tsx}', 'components/**/*.tsx', 'lib/**/*.ts', 'middleware.ts'],
      exclude: ['**/*.test.{ts,tsx}'],
      reportsDirectory: '../../coverage/web',
      // Rutas relativas a la raíz del repo: SonarQube resuelve el LCOV desde ahí.
      reporter: [['lcov', { projectRoot: fromHere('../../') }], 'text-summary'],
    },
  },
});
