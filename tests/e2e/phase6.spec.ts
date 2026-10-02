import { expect, test } from "@playwright/test";
import { E2E_SITE_URL } from "../../playwright.config";
import { signIn, testSql } from "./helpers";

test.describe.configure({ mode: "serial" });
const RUN = Date.now().toString(36);

test("ad placeholders switched on in Settings show on a live post, then off again", async ({ page, browser }) => {
  await signIn(page);
  await page.goto("/settings");
  const placeholders = page.getByRole("switch", { name: /Show ad placeholders/ });
  if ((await placeholders.getAttribute("aria-checked")) !== "true") await placeholders.click();
  await expect(page.getByLabel("Ads preview")).toContainText("in-article");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText(/Settings saved/)).toBeVisible();

  const visitor = await browser.newPage();
  await visitor.goto(`${E2E_SITE_URL}/blog/how-passkeys-work`);
  await expect(visitor.locator("[data-ad-placement]").first()).toBeVisible();

  await placeholders.click();
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/settings")),
    page.getByRole("button", { name: "Save settings" }).click(),
  ]);
  await visitor.reload();
  await expect(visitor.locator("[data-ad-placement]")).toHaveCount(0);
  await visitor.close();
});

test("invalid AdSense IDs are rejected", async ({ page }) => {
  await signIn(page);
  await page.goto("/settings");
  await page.getByLabel("AdSense client ID").fill("pub-123");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("AdSense client IDs look like ca-pub-0000000000000000")).toBeVisible();
});

test("editors can't open Settings and don't see it in the menu", async ({ page }) => {
  await signIn(page, "editor");
  await expect(page.getByRole("link", { name: "Settings" })).toHaveCount(0);
  const res = await page.goto("/settings");
  expect(res?.status()).toBe(403);
  await expect(page.getByText("Admins only")).toBeVisible();
});

test("a message sent from the site's contact form lands in the inbox", async ({ page, browser }) => {
  const visitor = await browser.newPage();
  await visitor.goto(`${E2E_SITE_URL}/contact`);
  const form = visitor.getByTestId("contact-form");
  await form.getByLabel("Name").fill(`Reader ${RUN}`);
  await form.getByLabel("Email").fill(`reader-${RUN}@example.com`);
  await form.getByLabel("Message").fill("Hello! I loved the passkeys guide. Could you write one about password managers?");
  await visitor.waitForTimeout(2700); // the site treats instant submissions as bots
  await form.getByRole("button", { name: "Send message" }).click();
  await expect(visitor.getByText(/Thanks for getting in touch/)).toBeVisible();

  await visitor.goto(`${E2E_SITE_URL}/`);
  const newsletter = visitor.getByTestId("newsletter-form");
  await newsletter.getByRole("textbox", { name: "Email address" }).fill(`news-${RUN}@example.com`);
  await newsletter.getByRole("checkbox").check();
  await visitor.waitForTimeout(2700);
  await newsletter.getByRole("button", { name: /Subscribe/ }).click();
  await expect(visitor.getByText(/check your inbox/).first()).toBeVisible();
  await visitor.close();

  await signIn(page, "editor");
  await expect(page.getByRole("link", { name: /Messages/ }).first()).toContainText(/\d/);
  await page.goto("/messages");
  const item = page.getByRole("button", { name: new RegExp(`Reader ${RUN}`) });
  await expect(item).toContainText("(unread)");
  await item.click();
  await expect(page.getByRole("link", { name: "Reply by email" })).toHaveAttribute("href", new RegExp(`mailto:reader-${RUN}@example.com`));
  await expect(item).not.toContainText("(unread)");

  await page.goto("/messages?tab=subscribers");
  await expect(page.getByText(`news-${RUN}@example.com`)).toBeVisible();
  const csv = await page.request.get("/api/export/subscribers");
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain(`news-${RUN}@example.com`);
});

test("CSV export needs a signed-in user", async ({ request }) => {
  const res = await request.get("/api/export/subscribers", { maxRedirects: 0 });
  expect(res.status()).toBeGreaterThanOrEqual(300);
  expect(await res.text()).not.toContain("@example.com");
});

test("categories: add a job category, it can be deleted while unused; used ones can't", async ({ page }) => {
  await signIn(page);
  await page.goto("/categories");
  await page.getByRole("tab", { name: /Jobs/ }).click();
  await page.getByRole("button", { name: "Add job category" }).click();
  await page.getByLabel("Name").fill(`Healthcare ${RUN}`);
  await page.getByLabel("Description").fill("Nursing, pharmacy, lab and clinic roles.");
  await page.getByRole("button", { name: "Add category" }).click();
  await expect(page.getByText("Category added.")).toBeVisible();
  const list = page.getByRole("list", { name: "Job categories" });
  await expect(list).toContainText(`Healthcare ${RUN}`);
  await list.getByRole("button", { name: `Delete Healthcare ${RUN}` }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete" }).click();
  await expect(page.getByText("Category deleted.")).toBeVisible();
  // Categories that posts use can't be deleted.
  await page.getByRole("tab", { name: /Blog/ }).click();
  await expect(page.getByRole("list", { name: "Blog categories" }).getByRole("button", { name: "Delete Technology" })).toBeDisabled();
  const [{ n }] = (await testSql("select count(*)::int as n from categories where name = $1", [`Healthcare ${RUN}`])).rows;
  expect(n).toBe(0);
});

test("authors: edit a bio and see the validation from the site's schema", async ({ page }) => {
  await signIn(page);
  await page.goto("/authors");
  await page.getByRole("button", { name: /Edit BlogNest Editorial Team/ }).click();
  await page.getByLabel("Bio").fill("Too short");
  await page.getByRole("button", { name: "Save changes" }).click();
  await expect(page.getByRole("dialog").getByText(/at least|>=|40/i).first()).toBeVisible();
});
