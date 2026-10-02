import { defineConfig, devices } from "@playwright/test";

const PORT = 3101;
const SITE_PORT = 3102;
export const E2E_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:54329/blognest_test";
export const E2E_SITE_URL = `http://localhost:${SITE_PORT}`;
/** Test-only shared secret between the two apps under test. */
const E2E_REVALIDATE_SECRET = "e2e-revalidate-secret-not-for-production";
const SITE_DIR = process.env.BLOGNEST_DIR ?? "../blognest";

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
  webServer: [
    {
      // The public site, reading the same test database, so we can check what visitors see.
      command: `cd ${SITE_DIR} && npx next build && npx next start -p ${SITE_PORT}`,
      url: E2E_SITE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      env: {
        DATABASE_URL: E2E_DATABASE_URL,
        REVALIDATE_SECRET: E2E_REVALIDATE_SECRET,
        NEXT_PUBLIC_SITE_URL: E2E_SITE_URL,
        NEXT_DIST_DIR: ".next-e2e",
      },
    },
    {
      command: `npx next build && npx next start -p ${PORT}`,
      url: `http://localhost:${PORT}/login`,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      env: {
        DATABASE_URL: E2E_DATABASE_URL,
        PUBLIC_SITE_URL: E2E_SITE_URL,
        REVALIDATE_SECRET: E2E_REVALIDATE_SECRET,
        NEXT_DIST_DIR: ".next-e2e",
        ADMIN_STYLE_GUIDE: "true",
      },
    },
  ],
});
