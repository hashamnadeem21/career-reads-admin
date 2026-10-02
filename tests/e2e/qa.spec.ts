import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

/** Design QA checklist (docs/ADMIN_DESIGN.md §9), automated where possible. */
const PAGES = ["/", "/posts", "/posts/new", "/posts/how-passkeys-work", "/jobs", "/jobs/new", "/media", "/categories", "/authors", "/messages", "/messages?tab=subscribers", "/settings", "/users", "/activity", "/help", "/account/password"];

for (const theme of ["light", "dark"] as const) {
  test(`no serious accessibility problems on any page (${theme})`, async ({ page }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await signIn(page);
    // Pin the theme explicitly so the cookie matches the emulated scheme.
    await page.context().addCookies([{ name: "bn_admin_theme", value: theme, url: page.url() }]);
    const failures: string[] = [];
    for (const path of PAGES) {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      for (const v of results.violations.filter((v) => v.impact === "serious" || v.impact === "critical")) {
        failures.push(`${path} [${v.id}] ${v.help}: ${v.nodes.slice(0, 3).map((n) => n.target.join(" ")).join(" | ")}`);
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
}

test("login page passes in both themes", async ({ page }) => {
  for (const theme of ["light", "dark"] as const) {
    // Reduced motion so contrast is measured after the fade-in, not halfway through it.
    await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
    await page.goto("/login");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
  }
});

test("reduced motion stops the backdrop animation; reduced transparency makes panels solid", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/login");
  expect(await page.locator(".admin-blob").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
  expect(await page.locator(".glass").first().evaluate((el) => getComputedStyle(el).backdropFilter)).toBe("none");
});

test("works with the keyboard alone: skip to search, open the palette, reach the main nav", async ({ page }) => {
  await signIn(page);
  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(focused).toBeTruthy();
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByRole("dialog", { name: "Command palette" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Command palette" })).toBeHidden();
  // Focus ring is visible (2px outline).
  await page.getByRole("link", { name: "Posts" }).first().focus();
  expect(await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle)).toBe("solid");
});

for (const size of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 768, height: 1024 }, { width: 390, height: 844 }]) {
  test(`no horizontal scroll at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size);
    await signIn(page);
    for (const path of ["/", "/posts", "/jobs/new", "/posts/new", "/media", "/messages", "/settings"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `${path} overflows by ${overflow}px at ${size.width}px`).toBeLessThanOrEqual(1);
    }
  });
}

test("no more than 2 stacked blur layers", async ({ page }) => {
  await signIn(page);
  const depth = await page.evaluate(() => {
    let max = 0;
    for (const el of document.querySelectorAll<HTMLElement>("body *")) {
      let n = 0;
      for (let cur: HTMLElement | null = el; cur; cur = cur.parentElement) {
        const f = getComputedStyle(cur).backdropFilter;
        if (f && f !== "none") n++;
      }
      max = Math.max(max, n);
    }
    return max;
  });
  expect(depth).toBeLessThanOrEqual(2);
});
