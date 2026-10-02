#!/usr/bin/env node
/**
 * Copies the public site's shared rules (schemas, image placement, visibility,
 * category lists) into src/shared/ so the admin validates and previews content
 * exactly like the site. Run after changing any of these files in blognest:
 *
 *   npm run sync:shared            (reads BLOGNEST_DIR, default ../blognest)
 *   npm run sync:shared -- --check (exit 1 if the copies are out of date)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const siteDir = path.resolve(root, process.env.BLOGNEST_DIR ?? "../blognest");
const check = process.argv.includes("--check");

/** [site path, admin path] */
const FILES = [
  ["src/lib/categories.ts", "src/shared/categories.ts"],
  ["src/lib/content/schema.ts", "src/shared/content/schema.ts"],
  ["src/lib/content/toc.ts", "src/shared/content/toc.ts"],
  ["src/lib/content/visibility.ts", "src/shared/content/visibility.ts"],
  ["src/lib/jobs/categories.ts", "src/shared/jobs/categories.ts"],
  ["src/lib/jobs/schema.ts", "src/shared/jobs/schema.ts"],
  ["src/lib/jobs/visibility.ts", "src/shared/jobs/visibility.ts"],
  ["src/lib/settings-schema.ts", "src/shared/settings-schema.ts"],
];

/** Site import specifiers → admin equivalents. */
const IMPORTS = {
  "@/lib/categories": "@/shared/categories",
  "@/lib/content/schema": "@/shared/content/schema",
  "@/lib/jobs/categories": "@/shared/jobs/categories",
};

let stale = 0;
for (const [from, to] of FILES) {
  const source = path.join(siteDir, from);
  if (!existsSync(source)) {
    console.warn(`skip   ${from} (not in ${siteDir})`);
    continue;
  }
  let code = readFileSync(source, "utf8");
  for (const [a, b] of Object.entries(IMPORTS)) code = code.replaceAll(`"${a}"`, `"${b}"`);
  const out = `// Copied from blognest/${from} by scripts/sync-shared.mjs. Do not edit here: change the site, then re-run \`npm run sync:shared\`.\n${code}`;
  const target = path.join(root, to);
  const current = existsSync(target) ? readFileSync(target, "utf8") : "";
  if (current === out) continue;
  stale++;
  if (check) {
    console.error(`stale  ${to}`);
    continue;
  }
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, out);
  console.log(`synced ${to}`);
}
if (check && stale) process.exit(1);
