import { defineConfig } from '@playwright/test';
import { assertTestDatabase } from './test/datos-de-prueba.cjs';

// Las e2e crean y borran usuarios: solo corren contra la rama "pruebas" de Neon (pnpm test:e2e).
assertTestDatabase();

export default defineConfig({
  testDir: 'e2e',
  // Un solo worker: los specs comparten los servidores de desarrollo y la base de pruebas.
  workers: 1,
  retries: 0,
  // La primera visita a cada ruta compila en `next dev` y Neon puede estar despertando.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  webServer: [
    {
      command: 'pnpm dev:api',
      url: 'http://localhost:4000/api/v1/health',
      timeout: 180_000,
      reuseExistingServer: false,
    },
    {
      command: 'pnpm dev:web',
      url: 'http://localhost:3000/login',
      timeout: 180_000,
      reuseExistingServer: false,
    },
  ],
});
