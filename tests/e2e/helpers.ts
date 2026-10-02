import { expect, type Page } from "@playwright/test";
import { Client } from "pg";
import { E2E_DATABASE_URL } from "../../playwright.config";
import { TEST_USERS } from "./seed";

/** Runs SQL against the e2e test database. */
export async function testSql(query: string, params: unknown[] = []) {
  const client = new Client({ connectionString: E2E_DATABASE_URL });
  await client.connect();
  try {
    return await client.query(query, params);
  } finally {
    await client.end();
  }
}

export async function signIn(page: Page, who: keyof typeof TEST_USERS = "admin") {
  // Every test signs in from the same IP; reset the login limiter so the suite isn't throttled.
  await testSql("delete from rate_limits where key like 'login-%'");
  const user = TEST_USERS[who];
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(`Hi, ${user.name.split(" ")[0]}`)).toBeVisible();
}
