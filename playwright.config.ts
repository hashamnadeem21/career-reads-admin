import { defineConfig, devices } from "@playwright/test";

const PORT = 3101;
export const E2E_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:54329/blognest_test";

/** Runs against a production build using the test database (seeded in global-setup). */
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.spec.ts",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  use: { baseURL: `http://localhost:${PORT}`, trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npx next build && npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: {
      DATABASE_URL: E2E_DATABASE_URL,
      NEXT_DIST_DIR: ".next-e2e",
      ADMIN_STYLE_GUIDE: "true",
    },
  },
});
