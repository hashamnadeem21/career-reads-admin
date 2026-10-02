import { expect, test } from "@playwright/test";
import { signIn, testSql as sql } from "./helpers";

test.describe.configure({ mode: "serial" });

test("without traffic every chart shows its empty state, never fake numbers", async ({ page }) => {
  await sql("truncate daily_stats");
  await signIn(page);
  await expect(page.getByRole("heading", { name: "My Dashboard" })).toBeVisible();
  await expect(page.getByText("Stats will appear here after your first visitors")).toBeVisible();
  await expect(page.getByText("No job views yet")).toBeVisible();
  await expect(page.getByRole("button", { name: "Export CSV" })).toBeDisabled();
});

test("traffic counted by the site shows up on the dashboard", async ({ page }) => {
  await sql(`insert into daily_stats (day, path, kind, entity_slug, count) values
    ((now() at time zone 'utc')::date, '/blog/how-passkeys-work', 'view', 'how-passkeys-work', 12),
    ((now() at time zone 'utc')::date - 1, '/blog/how-passkeys-work', 'view', 'how-passkeys-work', 5),
    ((now() at time zone 'utc')::date, '/jobs/x', 'apply_click', 'x', 3)`);
  await signIn(page);
  const traffic = page.locator("section", { has: page.getByRole("heading", { name: "Traffic & engagement" }) });
  await expect(traffic.locator("li", { hasText: "Page views" })).toContainText("17");
  await expect(traffic.locator("li", { hasText: "Apply clicks" })).toContainText("3");
  await traffic.getByRole("radio", { name: "7D" }).click();
  await expect(traffic.getByRole("radio", { name: "7D" })).toHaveAttribute("aria-checked", "true");
});

test("Customize hides a card and the choice is saved per user", async ({ page }) => {
  await signIn(page);
  await expect(page.locator('[data-card="drafts"]')).toBeVisible();
  await page.getByRole("button", { name: "Customize" }).click();
  const dialog = page.getByRole("dialog", { name: "Customize dashboard" });
  await dialog.getByRole("switch", { name: "Drafts" }).click();
  await dialog.getByRole("button", { name: "Save layout" }).click();
  await expect(page.getByText("Dashboard layout saved")).toBeVisible();
  await expect(page.locator('[data-card="drafts"]')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('[data-card="drafts"]')).toHaveCount(0);

  // Restore for other tests.
  await page.getByRole("button", { name: "Customize" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Reset" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Save layout" }).click();
  await expect(page.locator('[data-card="drafts"]')).toBeVisible();
});
