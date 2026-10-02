/**
 * Creates (or resets) the QA accounts used by the e2e tests and local checks.
 * Test-only values: never run this against production.
 *
 *   DATABASE_URL=... npx tsx scripts/seed-test-users.ts
 */
import { config } from "dotenv";
import { closeDb, getDb } from "@/db";
import { seedTestUsers } from "../tests/e2e/seed";

config({ path: [".env.local", ".env"], quiet: true });

seedTestUsers(getDb())
  .then((users) => console.log(`Seeded ${users.map((u) => u.email).join(", ")}`))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(closeDb);
