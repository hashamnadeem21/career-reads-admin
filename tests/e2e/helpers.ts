import { expect, type Page } from "@playwright/test";
import { TEST_USERS } from "./seed";

export async function signIn(page: Page, who: keyof typeof TEST_USERS = "admin") {
  const user = TEST_USERS[who];
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText(`Hi, ${user.name.split(" ")[0]}`)).toBeVisible();
}
