import { execFileSync } from "node:child_process";
import { E2E_API_DIR, E2E_DATABASE_URL, SITE_DIR } from "../../playwright.config";
import { TEST_COMPANIES, TEST_USERS } from "./seed";

/**
 * Fresh test database before the servers start: migrations, the site's real content and the QA
 * accounts. The API owns the database, so its `e2e:seed` script does the work.
 */
export default async function globalSetup() {
  execFileSync("npm", ["run", "--silent", "e2e:seed"], {
    cwd: E2E_API_DIR,
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: E2E_DATABASE_URL,
      BLOGNEST_DIR: SITE_DIR,
      E2E_SEED: JSON.stringify({ companies: TEST_COMPANIES, users: TEST_USERS }),
    },
  });
}
