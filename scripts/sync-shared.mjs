#!/usr/bin/env node
/**
 * Copies the API's content rules that the admin UI needs into src/shared/: the MDX rules and
 * table of contents for the post preview, the schemas behind the editor's live hints, and the
 * job and settings label lists. The API (blognest-api) owns them and validates every save;
 * these copies only keep the screens in step. Run after changing any of them in the API:
 *
 *   npm run sync:shared            (reads BLOGNEST_API_DIR, default ../blognest-api)
 *   npm run sync:shared -- --check (exit 1 if the copies are out of date)
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const apiDir = path.resolve(root, process.env.BLOGNEST_API_DIR ?? "../blognest-api");
const check = process.argv.includes("--check");

const FILES = [
  "content/schema.ts",
  "content/toc.ts",
  "content/safe-mdx.ts",
  "jobs/categories.ts",
  "jobs/schema.ts",
  "settings-schema.ts",
];

let stale = 0;
for (const file of FILES) {
  const source = path.join(apiDir, "src/shared", file);
  if (!existsSync(source)) {
    console.warn(`skip   ${file} (not in ${apiDir})`);
    continue;
  }
  const code = readFileSync(source, "utf8")
    .replace(/^\/\/ Owned by blognest-api.*\n/, "")
    // The API is ESM with explicit .js extensions; the admin's bundler resolves bare paths.
    .replace(/(from "\.{1,2}\/[^"]+)\.js"/g, '$1"');
  const out = `// Copied from blognest-api/src/shared/${file} by scripts/sync-shared.mjs. Do not edit here: change the API, then re-run \`npm run sync:shared\`.\n${code}`;
  const target = path.join(root, "src/shared", file);
  const current = existsSync(target) ? readFileSync(target, "utf8") : "";
  if (current === out) continue;
  stale++;
  if (check) {
    console.error(`stale  src/shared/${file}`);
    continue;
  }
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, out);
  console.log(`synced src/shared/${file}`);
}
if (check && stale) process.exit(1);
