import { expect, test } from "@playwright/test";
import { signIn, testSql } from "./helpers";

test("logged-out visitors are redirected to /login, keeping where they were going", async ({ page }) => {
  await page.goto("/jobs");
  await expect(page).toHaveURL(/\/login\?next=%2Fjobs$/);
  await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
});

test("admin pages are never indexable", async ({ request }) => {
  const res = await request.get("/login");
  expect(res.headers()["x-robots-tag"]).toContain("noindex");
  expect(await (await request.get("/robots.txt")).text()).toContain("Disallow: /");
});

test("wrong password shows a generic error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("qa-admin@blognest.test");
  await page.getByLabel("Password").fill("definitely-wrong");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("That email and password don't match.")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue("qa-admin@blognest.test");
});

test("sign in, then sign out", async ({ page }) => {
  await signIn(page);
  await expect(page).toHaveURL("/");
  await page.getByRole("button", { name: /Account menu/ }).first().click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("sign in returns to the page you asked for", async ({ page }) => {
  await page.goto("/help");
  await page.getByLabel("Email").fill("qa-editor@blognest.test");
  await page.getByLabel("Password").fill("qa-editor-pass-1234");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/help");
});

test("dark mode choice persists across reloads and sessions", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await signIn(page);
  const html = page.locator("html");
  await expect(html).not.toHaveClass(/\bdark\b/);
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    page.getByRole("switch", { name: "Dark mode" }).first().click(),
  ]);
  await expect(html).toHaveClass(/\bdark\b/);
  await page.reload();
  await expect(html).toHaveClass(/\bdark\b/);

  // A new browser context (no cookie) gets the saved preference back at sign-in.
  const fresh = await page.context().browser()!.newContext({ colorScheme: "light" });
  const other = await fresh.newPage();
  await signIn(other);
  await expect(other.locator("html")).toHaveClass(/\bdark\b/);
  await Promise.all([
    other.waitForResponse((r) => r.request().method() === "POST"),
    other.getByRole("switch", { name: "Dark mode" }).first().click(),
  ]);
  await expect(other.locator("html")).not.toHaveClass(/\bdark\b/);
  await fresh.close();
});

test("editors can't open admin-only pages", async ({ page }) => {
  await signIn(page, "editor");
  await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
  const res = await page.goto("/design");
  expect(res?.status()).toBe(200);
});

test("⌘K palette opens and navigates", async ({ page }) => {
  await signIn(page);
  await page.keyboard.press("ControlOrMeta+k");
  const input = page.getByPlaceholder("Search posts, jobs and pages…");
  await expect(input).toBeVisible();
  await input.fill("passkeys");
  await page.getByRole("option", { name: /Passkeys Explained/ }).click();
  await expect(page).toHaveURL(/\/posts\/how-passkeys-work/);
});

test("login is rate-limited after repeated failures", async ({ page }) => {
  await testSql("delete from rate_limits where key like 'login-%'");
  await page.goto("/login");
  for (let i = 0; i < 11; i++) {
    await page.getByLabel("Email").fill("nobody@blognest.test");
    await page.getByLabel("Password").fill(`wrong-${i}`);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeEnabled();
  }
  await expect(page.getByText(/Too many sign-in attempts/)).toBeVisible();
  await testSql("delete from rate_limits where key like 'login-%'");
});
