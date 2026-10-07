import { eq } from "drizzle-orm";
import type { Database } from "@/db";
import { companies, sessions, users } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";

/** QA companies (local databases only). Two of them, to test that each sees only its own jobs. */
export const TEST_COMPANIES = {
  acme: { name: "Acme QA Ltd", website: "https://acme.example", autoPublish: false },
  globex: { name: "Globex QA Ltd", website: "https://globex.example", autoPublish: true },
};

/** QA accounts for e2e tests and local checks (local databases only). */
export const TEST_USERS = {
  admin: { email: "qa-admin@blognest.test", name: "Quinn Admin", role: "super_admin" as const, password: "qa-admin-pass-1234", company: null },
  editor: { email: "qa-editor@blognest.test", name: "Eddie Editor", role: "editor" as const, password: "qa-editor-pass-1234", company: null },
  acme: { email: "qa-acme@blognest.test", name: "Ada Acme", role: "company" as const, password: "qa-acme-pass-1234", company: "acme" as const },
  globex: { email: "qa-globex@blognest.test", name: "Gil Globex", role: "company" as const, password: "qa-globex-pass-1234", company: "globex" as const },
};

export async function seedTestUsers(db: Database) {
  const url = process.env.DATABASE_URL ?? "";
  if (/neon\.tech/.test(url)) throw new Error("Refusing to seed QA users into a Neon (production) database.");

  const companyIds: Record<string, string> = {};
  for (const [key, c] of Object.entries(TEST_COMPANIES)) {
    const [row] = await db
      .insert(companies)
      .values(c)
      .onConflictDoUpdate({ target: companies.name, set: { website: c.website, autoPublish: c.autoPublish, active: true } })
      .returning();
    companyIds[key] = row.id;
  }

  const seeded = [];
  for (const u of Object.values(TEST_USERS)) {
    const passwordHash = await hashPassword(u.password);
    const companyId = u.company ? companyIds[u.company] : null;
    const [row] = await db
      .insert(users)
      .values({ email: u.email, name: u.name, role: u.role, companyId, passwordHash, mustChangePassword: false })
      .onConflictDoUpdate({ target: users.email, set: { name: u.name, role: u.role, companyId, passwordHash, mustChangePassword: false } })
      .returning();
    await db.delete(sessions).where(eq(sessions.userId, row.id));
    seeded.push(row);
  }
  return seeded;
}
