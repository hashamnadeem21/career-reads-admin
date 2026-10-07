import { expect, test, type Page } from "@playwright/test";
import { E2E_SITE_URL } from "../../playwright.config";
import { signIn, testSql } from "./helpers";
import { TEST_COMPANIES } from "./seed";

test.describe.configure({ mode: "serial" });

const RUN = Date.now().toString(36);
const ACME_TITLE = `QA Acme Data Analyst ${RUN}`;
const GLOBEX_TITLE = `QA Globex Designer ${RUN}`;

/** Fills the job form with valid details. `publish` picks the second status option. */
async function fillJob(page: Page, title: string) {
  await page.getByRole("textbox", { name: "Job title", exact: true }).fill(title);
  await page.getByRole("textbox", { name: "City", exact: true }).fill("Karachi");
  await page.getByLabel("Category").selectOption("software-it");
  await page.getByRole("textbox", { name: "Summary", exact: true }).fill("Turn messy data into clear weekly reports for the sales team.");
  await page.getByRole("textbox", { name: "Responsibility 1", exact: true }).fill("Build weekly sales dashboards");
  await page.getByRole("textbox", { name: "Requirement 1", exact: true }).fill("Strong SQL and spreadsheet skills");
  await page.getByRole("radio", { name: "Apply email" }).click();
  await page.getByRole("textbox", { name: "Apply email", exact: true }).fill("jobs@company.test");
}

const slugFromUrl = (page: Page) => new URL(page.url()).pathname.split("/").pop()!;

test("company accounts only see job pages; everything else is 403", async ({ page, request }) => {
  await signIn(page, "acme");
  const nav = page.getByRole("navigation", { name: "Main" }).first();
  await expect(nav.getByRole("link", { name: "Jobs" })).toBeVisible();
  for (const name of ["Posts", "Companies", "Categories", "Authors", "Media", "Messages", "Users", "Settings", "Quick post", "Help"]) {
    await expect(page.getByRole("link", { name, exact: true })).toHaveCount(0);
  }
  await expect(page.getByRole("heading", { level: 1, name: TEST_COMPANIES.acme.name })).toBeVisible();

  for (const path of ["/posts", "/posts/new", "/messages", "/media", "/categories", "/authors", "/activity", "/help", "/design", "/users", "/settings", "/companies"]) {
    expect((await page.goto(path))?.status(), path).toBe(403);
  }
  // Session cookie is shared with the page; the API rejects company accounts too.
  const cookies = await page.context().cookies();
  const res = await request.get("/api/export/subscribers", {
    headers: { cookie: cookies.map((c) => `${c.name}=${c.value}`).join("; ") },
    maxRedirects: 0,
  });
  expect(res.status()).toBe(403);
});

test("an untrusted company's job waits for review, then goes live when approved", async ({ page, browser }) => {
  await signIn(page, "acme");
  await page.goto("/jobs/new");
  // The company name comes from the account and can't be edited; there's no Featured switch.
  await expect(page.getByRole("textbox", { name: "Company", exact: true })).toHaveValue(TEST_COMPANIES.acme.name);
  await expect(page.getByRole("textbox", { name: "Company", exact: true })).toHaveAttribute("readonly", "");
  await expect(page.getByRole("switch", { name: /Featured/ })).toHaveCount(0);

  await fillJob(page, ACME_TITLE);
  await page.getByRole("radio", { name: "Submit for review" }).check();
  await page.getByRole("button", { name: "Submit for review" }).click();
  await expect(page.getByText("Sent for review.")).toBeVisible();
  await expect(page.getByText("Waiting for review.")).toBeVisible();
  const slug = slugFromUrl(page);

  // Not on the public site yet.
  const visitor = await browser.newPage();
  expect((await visitor.goto(`${E2E_SITE_URL}/jobs/${slug}`))?.status()).toBe(404);

  // The owner sees it in the review queue and approves it.
  const owner = await browser.newPage();
  await signIn(owner, "admin");
  await owner.goto("/jobs?status=review");
  await owner.getByRole("link", { name: new RegExp(ACME_TITLE) }).first().click();
  await expect(owner.getByText("Waiting for your review.")).toBeVisible();
  await owner.getByRole("button", { name: "Approve & publish" }).click();
  await expect(owner.getByText("Approved and published.")).toBeVisible();

  await visitor.goto(`${E2E_SITE_URL}/jobs/${slug}`);
  await expect(visitor.getByRole("heading", { level: 1, name: ACME_TITLE })).toBeVisible();
  await expect(visitor.getByText(TEST_COMPANIES.acme.name).first()).toBeVisible();

  // Editing a live job sends it back to review (it leaves the site until approved again).
  await page.reload();
  await expect(page.getByText("Saving changes takes this job off the site")).toBeVisible();
  await page.getByRole("textbox", { name: "Salary", exact: true }).fill("PKR 150,000 / month");
  await page.getByRole("button", { name: "Save and submit for review" }).click();
  await expect(page.getByText("Waiting for review.")).toBeVisible();
  expect((await visitor.goto(`${E2E_SITE_URL}/jobs/${slug}`))?.status()).toBe(404);

  // The owner sends it back with a note; the company sees the note.
  await owner.goto(`/jobs/${slug}`);
  await owner.getByRole("button", { name: "Send back" }).click();
  await owner.getByLabel("What should they change?").fill("Please add the salary in a range, e.g. 150,000 – 200,000.");
  await owner.getByRole("dialog").getByRole("button", { name: "Send back" }).click();
  await expect(owner.getByText("Sent back to the company with your note.")).toBeVisible();

  await page.reload();
  await expect(page.getByText("Career Reads asked for changes")).toBeVisible();
  await expect(page.getByText("Please add the salary in a range")).toBeVisible();
  await owner.close();
  await visitor.close();
});

test("a trusted company publishes directly, and each company sees only its own jobs", async ({ page, browser }) => {
  await signIn(page, "globex");
  await page.goto("/jobs/new");
  await fillJob(page, GLOBEX_TITLE);
  await page.getByRole("radio", { name: "Published" }).check();
  await page.getByRole("button", { name: "Publish job" }).click();
  await expect(page.getByText("Saved. The site is up to date.")).toBeVisible();
  const globexSlug = slugFromUrl(page);

  const visitor = await browser.newPage();
  await visitor.goto(`${E2E_SITE_URL}/jobs/${globexSlug}`);
  await expect(visitor.getByRole("heading", { level: 1, name: GLOBEX_TITLE })).toBeVisible();
  await visitor.close();

  // Globex can't see Acme's job: not in the list, not in search, and its page is a 404.
  await page.goto("/jobs");
  await expect(page.getByRole("link", { name: new RegExp(GLOBEX_TITLE) }).first()).toBeVisible();
  await expect(page.getByText(ACME_TITLE)).toHaveCount(0);
  const [{ slug: acmeSlug }] = (await testSql("select slug from jobs where title = $1", [ACME_TITLE])).rows;
  expect((await page.goto(`/jobs/${acmeSlug}`))?.status()).toBe(404);
  // …and can't see Career Reads's own jobs either.
  const staffSlug = `qa-staff-only-job-${RUN}`;
  await testSql(
    `insert into jobs (slug, title, company, country, work_model, employment_type, category, experience, summary, posted_at, status)
     values ($1, 'QA staff-only job', 'Career Reads', 'Pakistan', 'remote', 'full-time', 'software-it', 'entry', 'A job posted by Career Reads staff, not by any company account.', now(), 'draft')`,
    [staffSlug],
  );
  expect((await page.goto(`/jobs/${staffSlug}`))?.status()).toBe(404);

  await page.goto("/jobs");
  await page.keyboard.press("ControlOrMeta+k");
  await page.getByPlaceholder("Search your jobs and pages…").fill("QA Acme");
  await expect(page.getByText("Nothing found.")).toBeVisible();
});

test("companies see views and Apply clicks for their jobs; the owner sees every company", async ({ page, browser }) => {
  const [{ slug }] = (await testSql("select slug from jobs where title = $1", [GLOBEX_TITLE])).rows;
  const today = new Date().toISOString().slice(0, 10);
  await testSql(
    `insert into daily_stats (day, path, kind, entity_slug, count) values ($1, $2, 'view', $3, 40), ($1, $2, 'apply_click', $3, 6)
     on conflict (day, path, kind) do update set count = excluded.count`,
    [today, `/jobs/${slug}`, slug],
  );

  await signIn(page, "globex");
  const row = page.getByRole("row", { name: new RegExp(GLOBEX_TITLE) });
  await expect(row).toContainText("40");
  await expect(row).toContainText("6");
  await expect(row).toContainText("15%");

  const owner = await browser.newPage();
  await signIn(owner, "admin");
  await owner.goto("/companies");
  const companyRow = owner.getByRole("row", { name: new RegExp(TEST_COMPANIES.globex.name) });
  await expect(companyRow).toContainText("40");
  await expect(companyRow).toContainText("6");
  await companyRow.getByRole("link", { name: TEST_COMPANIES.globex.name }).click();
  await expect(owner.getByRole("row", { name: new RegExp(GLOBEX_TITLE) })).toContainText("40");
  await owner.close();
});

test("the owner adds a company and invites someone, who joins with a jobs-only account", async ({ page, browser }) => {
  const name = `QA Initech ${RUN}`;
  await signIn(page, "admin");
  await page.goto("/companies");
  await page.getByRole("button", { name: "New company" }).first().click();
  await page.getByLabel("Company name").fill(name);
  await page.getByRole("button", { name: "Create company" }).click();
  await expect(page.getByRole("heading", { level: 1, name: new RegExp(name) })).toBeVisible();

  await page.getByRole("button", { name: "Invite" }).click();
  await page.getByLabel("Name").fill("Ines Initech");
  await page.getByLabel("Work email").fill(`ines-${RUN}@initech.test`);
  await page.getByRole("button", { name: "Create invite link" }).click();
  const link = await page.getByLabel("Invite link").inputValue();

  const context = await browser.newContext();
  const invited = await context.newPage();
  await invited.goto(new URL(link).pathname);
  await expect(invited.getByText(`Join ${name} on Career Reads`)).toBeVisible();
  await invited.getByLabel("Choose a password").fill("initech-pass-12345!");
  await invited.getByLabel("Confirm password").fill("initech-pass-12345!");
  await invited.getByRole("button", { name: /Join/ }).click();
  await expect(invited.getByRole("heading", { level: 1, name })).toBeVisible();
  expect((await invited.goto("/posts"))?.status()).toBe(403);
  await context.close();
});

test("pausing a company signs its people out and blocks sign-in", async ({ page, browser }) => {
  const acme = await browser.newPage();
  await signIn(acme, "acme");

  await signIn(page, "admin");
  await page.goto("/companies");
  await page.getByRole("link", { name: TEST_COMPANIES.acme.name }).click();
  await page.getByRole("button", { name: "Pause" }).click();
  await page.getByRole("button", { name: "Pause company" }).click();
  await expect(page.getByText("is paused and signed out")).toBeVisible();

  await acme.goto("/jobs");
  await expect(acme).toHaveURL(/\/login/);
  await acme.getByLabel("Email").fill("qa-acme@blognest.test");
  await acme.getByLabel("Password").fill("qa-acme-pass-1234");
  await acme.getByRole("button", { name: "Sign in" }).click();
  await expect(acme.getByText("This company account is paused.")).toBeVisible();

  await page.getByRole("button", { name: "Reactivate" }).click();
  await expect(page.getByText("can sign in again")).toBeVisible();
  await acme.close();
});

test("editors can review jobs but can't manage companies", async ({ page }) => {
  await signIn(page, "editor");
  await expect(page.getByRole("link", { name: "Companies" })).toHaveCount(0);
  expect((await page.goto("/companies"))?.status()).toBe(403);
  expect((await page.goto("/jobs?status=review"))?.status()).toBe(200);
});
