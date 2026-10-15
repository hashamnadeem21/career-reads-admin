import { expect, test } from "@playwright/test";
import { E2E_SITE_URL } from "../../playwright.config";
import { signIn, testSql } from "./helpers";

/**
 * Candidate accounts across the three apps: someone signs up on the website to apply, the super
 * admin finds them under Candidates (list, filters, history, CSV) and deletes the account.
 */
test.describe.configure({ mode: "serial" });

const RUN = Date.now().toString(36);
const TITLE = `QA Flutter Developer ${RUN}`;
const CANDIDATE = { name: `Casey Candidate ${RUN}`, email: `casey-${RUN}@candidates.test`, password: "casey-pass-1234" };
const PDF = Buffer.from("%PDF-1.7\n1 0 obj << >> endobj\ntrailer << >>\n%%EOF\n");
let slug = "";

test("a job that takes applications on Career Reads asks visitors to sign in first", async ({ page, browser }) => {
  await signIn(page, "editor");
  await page.goto("/jobs/new");
  await page.getByRole("textbox", { name: "Job title", exact: true }).fill(TITLE);
  await page.getByRole("textbox", { name: "Company", exact: true }).fill("Career Reads");
  await page.getByRole("textbox", { name: "City", exact: true }).fill("Lahore");
  await page.getByLabel("Category").selectOption("software-it");
  await page.locator("#description").click();
  await page.keyboard.type("Build our Flutter app for job seekers with a small, friendly team. You ship features to the app stores.");
  await page.getByRole("switch", { name: /Apply on Career Reads/ }).click();
  await page.getByRole("radio", { name: "Career Reads only" }).click();
  await page.getByLabel("Deadline").fill(new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10));
  await page.getByRole("radio", { name: "Published" }).check();
  await page.getByRole("button", { name: "Publish job" }).click();
  await expect(page.getByText("Saved. The site is up to date.")).toBeVisible();
  slug = new URL(page.url()).pathname.split("/").pop()!;

  const visitor = await browser.newPage();
  await visitor.goto(`${E2E_SITE_URL}/jobs/${slug}/apply`);
  await expect(visitor.getByRole("heading", { name: "Sign in to apply" })).toBeVisible();
  await expect(visitor.getByTestId("apply-form")).toHaveCount(0);
  await visitor.close();
});

test("signing up on the website, then applying before confirming the email", async ({ browser }) => {
  const visitor = await browser.newPage();
  await visitor.goto(`${E2E_SITE_URL}/jobs/${slug}/apply`);
  const form = visitor.getByTestId("signup-form");
  await form.getByLabel("Full name").fill(CANDIDATE.name);
  await form.getByLabel("Email").fill(CANDIDATE.email);
  await form.getByLabel("Password", { exact: true }).fill(CANDIDATE.password);
  await form.getByLabel("Confirm password").fill(CANDIDATE.password);
  await form.getByRole("checkbox").check();
  await form.getByRole("button", { name: "Create account" }).click();

  const apply = visitor.getByTestId("apply-form");
  await expect(apply).toBeVisible();
  await expect(apply.getByLabel("Email")).toHaveValue(CANDIDATE.email);
  await expect(apply.getByLabel("Email")).toHaveJSProperty("readOnly", true);
  await expect(visitor.getByTestId("account-menu-button")).toBeVisible();

  await apply.getByLabel("Phone").fill("+92 300 1234567");
  await apply.getByRole("button", { name: "Next" }).click();
  await apply.locator('input[name="cv"]').setInputFiles({ name: "Casey CV.pdf", mimeType: "application/pdf", buffer: PDF });
  await apply.getByRole("button", { name: "Next" }).click();
  await apply.getByRole("checkbox").first().check();
  // The form refuses a send within a few seconds of opening (the site's bot check, MIN_FILL_MS).
  await visitor.waitForTimeout(3500);
  await apply.getByRole("button", { name: "Send application" }).click();
  await expect(visitor.getByText("Almost done: confirm your email")).toBeVisible();

  // Not subscribed yet, so the newsletter is offered once.
  const dialog = visitor.getByTestId("subscribe-dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Not now" }).click();
  await expect(dialog).toHaveCount(0);
  await visitor.close();
});

test("the super admin sees the account, its history and the held application", async ({ page }) => {
  await signIn(page);
  await page.goto("/candidates");
  await expect(page.getByRole("heading", { level: 1, name: "Candidates" })).toBeVisible();
  const row = page.getByRole("row", { name: new RegExp(CANDIDATE.name) });
  await expect(row).toBeVisible();
  await expect(row).toContainText("Email not confirmed");

  await page.getByLabel("Signed up with").selectOption("google");
  await expect(page.getByRole("row", { name: new RegExp(CANDIDATE.name) })).toHaveCount(0);
  await page.getByLabel("Signed up with").selectOption("password");
  await expect(page.getByRole("row", { name: new RegExp(CANDIDATE.name) })).toBeVisible();

  await page.getByRole("row", { name: new RegExp(CANDIDATE.name) }).getByRole("link").first().click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(CANDIDATE.name);
  await expect(page.getByText(`Applied for ${TITLE}`)).toBeVisible();
  await expect(page.getByText("Created an account with email and password")).toBeVisible();
  await expect(page.getByText("Waiting for email confirmation")).toBeVisible();

  // Held applications stay out of the Applicants list until the email is confirmed.
  await page.goto(`/applications?job=${slug}`);
  await expect(page.getByText(CANDIDATE.email)).toHaveCount(0);
});

test("the CSV follows the filters", async ({ page }) => {
  await signIn(page);
  const csv = await page.request.get(`/api/export/candidates?method=password&q=${encodeURIComponent(CANDIDATE.email)}`);
  expect(csv.status()).toBe(200);
  expect(csv.headers()["content-type"]).toMatch(/text\/csv/);
  const bytes = await csv.body();
  expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // BOM, so Excel reads UTF-8
  const lines = bytes.toString("utf8").replace(/^﻿/, "").trim().split("\r\n");
  expect(lines[0]).toBe("Name,Email,Signed up with,Email confirmed,Signed up,Last sign-in,Sign-ins,Applications,Subscribed to newsletter");
  expect(lines).toHaveLength(2);
  expect(lines[1]).toContain(`${CANDIDATE.name},${CANDIDATE.email},Email and password,No,`);
});

test("only the super admin can open Candidates", async ({ page, browser }) => {
  await signIn(page, "editor");
  await expect(page.getByRole("link", { name: "Candidates" })).toHaveCount(0);
  // The page streams its loading screen (HTTP 200) before the role check, so check what's shown.
  await page.goto("/candidates");
  await expect(page.getByText("You don't have access to this page")).toBeVisible();
  await expect(page.getByText(CANDIDATE.email)).toHaveCount(0);
  expect((await page.request.get("/api/export/candidates")).status()).toBe(403);
  // A fresh session: /login skips straight past for someone already signed in.
  const company = await (await browser.newContext({ baseURL: new URL(page.url()).origin })).newPage();
  await signIn(company, "acme");
  await company.goto(`/candidates/${"0".repeat(8)}-0000-4000-8000-${"0".repeat(12)}`);
  await expect(company.getByText("You don't have access to this page")).toBeVisible();
  await company.close();
});

test("deleting the account removes it everywhere and signs them out", async ({ page }) => {
  await signIn(page);
  await page.goto("/candidates");
  await page.getByRole("row", { name: new RegExp(CANDIDATE.name) }).getByRole("link").first().click();
  const id = new URL(page.url()).pathname.split("/").pop()!;
  await page.getByRole("button", { name: "Delete account" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Delete everything" }).click();
  await expect(page).toHaveURL(/\/candidates$/);
  await expect(page.getByRole("row", { name: new RegExp(CANDIDATE.name) })).toHaveCount(0);

  const left = await testSql("select count(*)::int as n from candidates where email = $1", [CANDIDATE.email]);
  expect(left.rows[0].n).toBe(0);
  const sessions = await testSql("select count(*)::int as n from candidate_sessions where candidate_id = $1", [id]);
  expect(sessions.rows[0].n).toBe(0);
});
