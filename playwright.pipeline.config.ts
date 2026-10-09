import { defineConfig } from "@playwright/test";
import { assertTestDatabase } from "./test/datos-de-prueba.cjs";
assertTestDatabase();
process.env.API_PORT = "4101";
process.env.NEXT_PUBLIC_API_URL = "http://localhost:4101/api/v1";
process.env.WAVE_NEXT_DIST_DIR = ".next-pipeline-test";
export default defineConfig({
  testDir: "e2e",
  testMatch: "pipeline.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 120000,
  expect: { timeout: 20000 },
  reporter: "list",
  use: { baseURL: "http://localhost:3101", trace: "retain-on-failure" },
  webServer: [
    {
      command: "node apps/api/dist/main.js",
      url: "http://localhost:4101/api/v1/health",
      reuseExistingServer: false,
      timeout: 120000,
    },
    {
      command:
        "node apps/web/node_modules/next/dist/bin/next dev apps/web --port 3101",
      url: "http://localhost:3101/login",
      reuseExistingServer: false,
      timeout: 180000,
    },
  ],
});
