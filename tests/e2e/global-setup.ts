import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { config } from "dotenv";
import { closeDb } from "@/db";
import { articles, authors, categories, jobs } from "@/db/schema";
import { buildImportPlan } from "@/lib/import/plan";
import { resetTestDb, useTestDb } from "../helpers/test-db";
import { seedTestUsers } from "./seed";

config({ path: [".env.local", ".env"], quiet: true });

async function files(dir: string, ext: RegExp) {
  const names = (await readdir(dir)).filter((f) => ext.test(f));
  return Promise.all(names.map(async (name) => ({ name, source: await readFile(path.join(dir, name), "utf8") })));
}

/** Fresh test database: migrations, the site's real content, and QA users. */
export default async function globalSetup() {
  const db = await useTestDb();
  await resetTestDb(db);
  const content = path.resolve(process.env.BLOGNEST_DIR ?? "../blognest", "content");
  const plan = buildImportPlan({
    articleFiles: await files(path.join(content, "articles"), /\.mdx?$/),
    authorFiles: await files(path.join(content, "authors"), /\.json$/),
    jobFiles: await files(path.join(content, "jobs"), /\.json$/),
  });
  await db.insert(categories).values(plan.categories);
  await db.insert(authors).values(plan.authors);
  await db.insert(articles).values(plan.articles);
  if (plan.jobs.length) await db.insert(jobs).values(plan.jobs);
  await seedTestUsers(db);
  await closeDb();
}
