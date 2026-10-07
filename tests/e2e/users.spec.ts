import { expect, test } from "@playwright/test";
import { signIn, testSql } from "./helpers";

test.describe.configure({ mode: "serial" });
const RUN = Date.now().toString(36);
const EMAIL = `new-editor-${RUN}@blognest.test`;
const NAME = `Nadia ${RUN}`;
let inviteLink = "";

test("an admin invites an editor and gets a one-time link", async ({ page }) => {
  await signIn(page);
  await page.goto("/users");
  await page.getByRole("button", { name: "Invite" }).click();
  await page.getByLabel("Name").fill(NAME);
  await page.getByLabel("Email").fill(EMAIL);
  await page.getByRole("button", { name: "Create invite link" }).click();
  inviteLink = await page.getByLabel("Invite link").inputValue();
  expect(inviteLink).toMatch(/\/invite\/[A-Za-z0-9_-]{40,}$/);
  // Only the hash of the token is stored.
  const { rows } = await testSql("select token_hash from invites where email = $1", [EMAIL]);
  expect(rows[0].token_hash).not.toBe(inviteLink.split("/").pop());
});

test("the invite creates an editor who can't see or open Settings and Users", async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(new URL(inviteLink).pathname);
  await expect(page.getByRole("heading", { name: "You're invited" })).toBeVisible();
  await page.getByLabel("Choose a password").fill("short");
  await page.getByRole("button", { name: "Join Career Reads Admin" }).click();
  await expect(page.getByText("Use at least 12 characters")).toBeVisible();
  await page.getByLabel("Choose a password").fill("a-strong-pass-123");
  await page.getByLabel("Confirm password").fill("a-strong-pass-123");
  await page.getByRole("button", { name: "Join Career Reads Admin" }).click();
  await expect(page.getByText(`Hi, Nadia`)).toBeVisible();

  await expect(page.getByRole("link", { name: "Settings" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Users" })).toHaveCount(0);
  expect((await page.goto("/settings"))?.status()).toBe(403);
  expect((await page.goto("/users"))?.status()).toBe(403);
  // Editors can still work on content.
  expect((await page.goto("/jobs/new"))?.status()).toBe(200);

  // The link can't be used twice.
  await page.goto(new URL(inviteLink).pathname);
  await expect(page.getByRole("heading", { name: "This invite isn't valid" })).toBeVisible();
  await context.close();
});

test("role changes take effect immediately, and the last super admin is protected", async ({ page }) => {
  await signIn(page);
  await page.goto("/users");
  const card = page.getByRole("listitem").filter({ hasText: NAME });
  await card.getByLabel(`Role for ${NAME}`).selectOption("super_admin");
  await expect(page.getByText(`${NAME} is now a super admin.`)).toBeVisible();
  await card.getByLabel(`Role for ${NAME}`).selectOption("editor");
  await expect(page.getByText(`${NAME} is now an editor.`)).toBeVisible();

  // With a single super admin, their role and removal controls are locked.
  const admins = (await testSql("select count(*)::int as n from users where role = 'super_admin'")).rows[0].n;
  if (admins === 1) {
    const me = page.getByRole("listitem").filter({ hasText: "(you)" });
    await expect(me.getByRole("combobox")).toBeDisabled();
    await expect(me.getByRole("button", { name: /Remove/ })).toBeDisabled();
  }
});

test("removing a user signs them out everywhere", async ({ page }) => {
  await signIn(page);
  await page.goto("/users");
  await page.getByRole("button", { name: `Remove ${NAME}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Remove" }).click();
  await expect(page.getByText(`${NAME} was removed.`)).toBeVisible();
  const { rows } = await testSql("select count(*)::int as n from sessions s join users u on u.id = s.user_id where u.email = $1", [EMAIL]);
  expect(rows[0].n).toBe(0);
});

test("the activity page lists changes", async ({ page }) => {
  await signIn(page);
  await page.goto("/activity");
  await expect(page.getByText(new RegExp(`${NAME}`)).first()).toBeVisible();
});
