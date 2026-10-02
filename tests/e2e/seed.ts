import { eq } from "drizzle-orm";
import type { Database } from "@/db";
import { sessions, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";

/** QA accounts for e2e tests and local checks (local databases only). */
export const TEST_USERS = {
  admin: { email: "qa-admin@blognest.test", name: "Quinn Admin", role: "admin" as const, password: "qa-admin-pass-1234" },
  editor: { email: "qa-editor@blognest.test", name: "Eddie Editor", role: "editor" as const, password: "qa-editor-pass-1234" },
};

export async function seedTestUsers(db: Database) {
  const url = process.env.DATABASE_URL ?? "";
  if (/neon\.tech/.test(url)) throw new Error("Refusing to seed QA users into a Neon (production) database.");
  const seeded = [];
  for (const u of Object.values(TEST_USERS)) {
    const passwordHash = await hashPassword(u.password);
    const [row] = await db
      .insert(users)
      .values({ email: u.email, name: u.name, role: u.role, passwordHash, mustChangePassword: false })
      .onConflictDoUpdate({ target: users.email, set: { name: u.name, role: u.role, passwordHash, mustChangePassword: false } })
      .returning();
    await db.delete(sessions).where(eq(sessions.userId, row.id));
    seeded.push(row);
  }
  return seeded;
}
