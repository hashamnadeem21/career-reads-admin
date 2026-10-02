/**
 * Captures reference screenshots of the main screens in both themes.
 * Needs the dev server (npm run dev) and the QA accounts (npx tsx scripts/seed-test-users.ts).
 *   node scripts/screenshots.mjs [baseUrl]
 */
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3001";
const out = new URL("../docs/screenshots/", import.meta.url).pathname;
const pages = [
  ["dashboard", "/"],
  ["posts", "/posts"],
  ["post-editor", "/posts/how-passkeys-work"],
  ["jobs", "/jobs"],
  ["job-form", "/jobs/new"],
  ["media", "/media"],
  ["categories", "/categories"],
  ["messages", "/messages"],
  ["settings", "/settings"],
  ["users", "/users"],
];

const browser = await chromium.launch();
for (const theme of ["light", "dark"]) {
  for (const [viewport, size] of [["desktop", { width: 1440, height: 900 }], ["phone", { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport: size, colorScheme: theme, reducedMotion: "reduce", deviceScaleFactor: 1 });
    await context.addCookies([{ name: "bn_admin_theme", value: theme, url: base }]);
    const page = await context.newPage();
    await page.goto(`${base}/login`);
    await page.screenshot({ path: `${out}${theme}-${viewport}-login.png` });
    await page.getByLabel("Email").fill("qa-admin@blognest.test");
    await page.getByLabel("Password").fill("qa-admin-pass-1234");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(`${base}/`);
    await context.addCookies([{ name: "bn_admin_theme", value: theme, url: base }]);
    for (const [name, path] of viewport === "phone" ? pages.slice(0, 3) : pages) {
      await page.goto(`${base}${path}`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${out}${theme}-${viewport}-${name}.png` });
    }
    await context.close();
  }
}
await browser.close();
console.log(`Screenshots saved to ${out}`);
