import path from "node:path";
import { defineConfig, devices } from "@playwright/test";

const PORT = 3101;
const SITE_PORT = 3102;
const API_PORT = 3103;
export const E2E_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:54329/blognest_test";
export const E2E_SITE_URL = `http://localhost:${SITE_PORT}`;
export const E2E_API_URL = `http://localhost:${API_PORT}`;
export const SITE_DIR = path.resolve(process.env.BLOGNEST_DIR ?? "../blognest");
export const E2E_API_DIR = path.resolve(process.env.BLOGNEST_API_DIR ?? "../blognest-api");

/** Test-only secrets shared by the three apps under test. */
const E2E_REVALIDATE_SECRET = "e2e-revalidate-secret-not-for-production";
const E2E_ADMIN_API_KEY = "e2e-admin-api-key-not-for-production-0123456789";
const E2E_SITE_API_KEY = "e2e-site-api-key-not-for-production-0123456789ab";

/**
 * All three apps, as production builds, on the test database (seeded in global-setup):
 * the API (the only one with a database), then the website and the admin, which both call it.
 */
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
      command: `cd ${E2E_API_DIR} && npm run build && node dist/main.js`,
      url: `${E2E_API_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      env: {
        PORT: String(API_PORT),
        DATABASE_URL: E2E_DATABASE_URL,
        JWT_SECRET: "e2e-jwt-secret-not-for-production-0123456789abcdef",
        ADMIN_API_KEY: E2E_ADMIN_API_KEY,
        SITE_API_KEY: E2E_SITE_API_KEY,
        ADMIN_URL: `http://localhost:${PORT}`,
        PUBLIC_SITE_URL: E2E_SITE_URL,
        REVALIDATE_SECRET: E2E_REVALIDATE_SECRET,
        // Uploads land in the site's public folder, as in local development.
        UPLOADS_DIR: path.join(SITE_DIR, "public", "uploads"),
        BLOB_READ_WRITE_TOKEN: "",
        CORS_ORIGINS: "",
      },
    },
    {
      // The public site, reading from the API, so we can check what visitors see. It prerenders
      // from the API at build time, so it waits for the API to answer first.
      command: `until curl -sf ${E2E_API_URL}/health >/dev/null; do sleep 1; done; cd ${SITE_DIR} && npx next build && npx next start -p ${SITE_PORT}`,
      url: E2E_SITE_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 480_000,
      env: {
        API_URL: E2E_API_URL,
        SITE_API_KEY: E2E_SITE_API_KEY,
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
        API_URL: E2E_API_URL,
        ADMIN_API_KEY: E2E_ADMIN_API_KEY,
        PUBLIC_SITE_URL: E2E_SITE_URL,
        NEXT_DIST_DIR: ".next-e2e",
        ADMIN_STYLE_GUIDE: "true",
      },
    },
  ],
});
