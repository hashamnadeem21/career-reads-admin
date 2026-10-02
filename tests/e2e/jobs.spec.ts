import { expect, test } from "@playwright/test";
import { E2E_SITE_URL } from "../../playwright.config";
import { signIn } from "./helpers";

test.describe.configure({ mode: "serial" });

const TITLE = `QA Backend Engineer ${Date.now().toString(36)}`;

test("create a job → it appears on the public /jobs page → unpublish → it's gone", async ({ page, browser }) => {
  await signIn(page, "editor");
  await page.goto("/jobs/new");

  await page.getByRole("textbox", { name: "Job title", exact: true }).fill(TITLE);
  await page.getByRole("textbox", { name: "Company", exact: true }).fill("Quality Assurance Labs");
  await expect(page.getByText("Page address: /jobs/qa-backend-engineer")).toBeVisible();
  await page.getByRole("textbox", { name: "City", exact: true }).fill("Lahore");
  await page.getByLabel("Category").selectOption("software-it");
  await page.getByRole("textbox", { name: "Summary", exact: true }).fill("Design and run reliable APIs for a fast-growing hiring product.");
  await page.getByRole("textbox", { name: "Responsibility 1", exact: true }).fill("Build and maintain REST APIs");
  await page.getByRole("textbox", { name: "Requirement 1", exact: true }).fill("3+ years with Node.js and Postgres");
  await page.getByRole("radio", { name: "Apply email" }).click();
  await page.getByRole("textbox", { name: "Apply email", exact: true }).fill("careers@qa-labs.test");
  const deadline = new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10);
  await page.getByLabel("Deadline").fill(deadline);
  await page.getByRole("radio", { name: "Published" }).check();

  // Live preview reflects the form.
  await expect(page.locator("article", { hasText: TITLE })).toContainText("Lahore, Pakistan");

  await page.getByRole("button", { name: "Publish job" }).click();
  await expect(page).toHaveURL(/\/jobs\/qa-backend-engineer-[a-z0-9]+-quality-assurance-labs$/);
  await expect(page.getByText("Saved. The site is up to date.")).toBeVisible();
  const slug = new URL(page.url()).pathname.split("/").pop()!;

  const visitor = await browser.newPage();
  await visitor.goto(`${E2E_SITE_URL}/jobs`);
  await expect(visitor.getByRole("link", { name: TITLE })).toBeVisible();
  await visitor.goto(`${E2E_SITE_URL}/jobs/${slug}`);
  await expect(visitor.getByRole("heading", { level: 1, name: TITLE })).toBeVisible();

  await page.getByRole("button", { name: "Unpublish" }).click();
  await expect(page.getByText("Unpublished.")).toBeVisible();

  await visitor.goto(`${E2E_SITE_URL}/jobs`);
  await expect(visitor.getByRole("link", { name: TITLE })).toHaveCount(0);
  const res = await visitor.goto(`${E2E_SITE_URL}/jobs/${slug}`);
  expect(res?.status()).toBe(404);
  await visitor.close();

  // The change is in the activity log.
  await page.goto("/");
  await expect(page.getByText(TITLE).first()).toBeVisible();
});

test("form errors keep what was typed", async ({ page }) => {
  await signIn(page);
  await page.goto("/jobs/new");
  await page.getByRole("textbox", { name: "Job title", exact: true }).fill("QA");
  await page.getByRole("button", { name: "Save draft" }).click();
  await expect(page.getByText("Please fix the highlighted fields.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Job title", exact: true })).toHaveValue("QA");
  await expect(page.getByRole("textbox", { name: "Job title", exact: true })).toHaveAttribute("aria-invalid", "true");
});

test("list filters, duplicate and delete", async ({ page }) => {
  await signIn(page);
  await page.goto("/jobs?status=draft");
  await expect(page.getByRole("radio", { name: /Drafts/ })).toHaveAttribute("aria-checked", "true");
  const row = page.getByRole("row", { name: new RegExp(TITLE) });
  await expect(row).toBeVisible();
  await row.getByRole("link").first().click();

  await page.getByRole("button", { name: "Duplicate" }).click();
  await expect(page).toHaveURL(/-copy$/);
  await expect(page.getByText("Copied as a new draft.")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Job title", exact: true })).toHaveValue(`${TITLE} (copy)`);

  await page.getByRole("button", { name: "Delete" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete job" }).click();
  await expect(page).toHaveURL(/\/jobs$/);
  await expect(page.getByText("Deleted.")).toBeVisible();
});
