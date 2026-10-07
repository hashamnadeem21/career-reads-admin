/**
 * Creates the first super admin (or resets an existing user's password) and prints a temporary password.
 *
 *   npm run admin:create -- email@example.com "Full Name"
 *   npm run admin:create -- email@example.com "Full Name" --reset
 */
import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { closeDb, getDb } from "@/db";
import { sessions, users } from "@/db/schema";
import { generateTemporaryPassword, hashPassword } from "@/lib/auth/password";

config({ path: [".env.local", ".env"], quiet: true });

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const reset = process.argv.includes("--reset");
  const email = z.email().trim().toLowerCase().safeParse(args[0]);
  const name = z.string().trim().min(2).max(80).safeParse(args[1]);
  if (!email.success || !name.success) {
    console.error('Usage: npm run admin:create -- email@example.com "Full Name" [--reset]');
    process.exitCode = 1;
    return;
  }

  const db = getDb();
  const password = generateTemporaryPassword();
  const passwordHash = await hashPassword(password);
  const [existing] = await db.select().from(users).where(eq(users.email, email.data)).limit(1);

  if (existing && !reset) {
    console.error(`${email.data} already exists. Add --reset to give it a new temporary password.`);
    process.exitCode = 1;
    return;
  }
  if (existing) {
    await db.update(users).set({ passwordHash, mustChangePassword: true, role: "super_admin", companyId: null }).where(eq(users.id, existing.id));
    await db.delete(sessions).where(eq(sessions.userId, existing.id));
  } else {
    await db.insert(users).values({ email: email.data, name: name.data, passwordHash, role: "super_admin", mustChangePassword: true });
  }

  console.log(`\n${existing ? "Reset" : "Created"} super admin ${name.data} <${email.data}>`);
  console.log(`Temporary password: ${password}`);
  console.log("You'll be asked to choose a new password after signing in.\n");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(closeDb);
