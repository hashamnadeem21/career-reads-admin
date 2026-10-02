import { expect, test, type Page } from "@playwright/test";
import { E2E_SITE_URL } from "../../playwright.config";
import { signIn } from "./helpers";

test.describe.configure({ mode: "serial" });

const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
const RUN = Date.now().toString(36);
const TITLE = `QA guide to placed images ${RUN}`;
const BODY = `This guide checks that images land exactly where the editor says they will.

## Getting started

Some words about getting started with the setup.

## Choosing a layout

The middle section explains how to pick a layout.

## Fine tuning the details

How to adjust spacing and captions.

## Final thoughts

Wrapping up.`;

async function chooseFromPicker(page: Page, trigger: string, fileName: string) {
  await page.getByRole("button", { name: trigger }).click();
  const dialog = page.getByRole("dialog");
  await dialog.locator('input[type="file"]').setInputFiles({ name: fileName, mimeType: "image/png", buffer: PNG });
  await expect(dialog).toBeHidden();
}

test("media library rejects non-images and accepts real images", async ({ page }) => {
  await signIn(page);
  await page.goto("/media");
  const input = page.locator('input[type="file"]').first();
  await input.setInputFiles({ name: "evil.png", mimeType: "image/png", buffer: Buffer.from("<svg onload=alert(1)>") });
  await expect(page.getByText(/evil\.png: Only JPG, PNG, WebP and AVIF/)).toBeVisible();
  await input.setInputFiles({ name: `qa-upload-${RUN}.png`, mimeType: "image/png", buffer: PNG });
  await expect(page.getByText("1 image uploaded")).toBeVisible();
  await page.getByRole("button", { name: `Open qa-upload-${RUN}` }).first().click();
  await page.getByLabel("Alt text").fill("A tiny QA test image");
  await page.getByRole("button", { name: "Save alt text" }).click();
  await expect(page.getByText("Alt text saved.")).toBeVisible();
  await expect(page.getByText("Not used anywhere yet.")).toBeVisible();
});

test("write a post with a hero and two placed images, publish, check the live page, unpublish", async ({ page, browser }) => {
  await signIn(page, "editor");
  await page.goto("/posts/new");

  await page.getByLabel("Title").fill(TITLE);
  await page.getByLabel("Post body (Markdown)").fill(BODY);

  // Details
  await page.getByRole("tab", { name: "Details" }).click();
  await page.getByLabel("Excerpt").fill("A short guide that checks image placement from the editor all the way to the live site.");
  await page.getByLabel("Category").selectOption("technology");
  await page.getByRole("textbox", { name: "Tags" }).fill("testing");
  await page.keyboard.press("Enter");
  await page.getByLabel("Author").selectOption("editorial-team");

  // Images
  await page.getByRole("tab", { name: "Images" }).click();
  await chooseFromPicker(page, "Choose hero image", `hero-${RUN}.png`);
  await page.getByLabel("Hero alt text").fill("A hero image for the QA guide");
  await page.getByRole("button", { name: "Add image" }).click();
  await chooseFromPicker(page, "Choose image", `middle-${RUN}.png`);
  await page.getByRole("textbox", { name: "Alt text", exact: true }).nth(0).fill("Image placed in the middle of the post");
  await page.getByLabel("Show this image").nth(0).selectOption("middle");
  await page.getByRole("button", { name: "Add image" }).click();
  await chooseFromPicker(page, "Choose image", `section-${RUN}.png`);
  await page.getByRole("textbox", { name: "Alt text", exact: true }).nth(1).fill("Image placed under the fine tuning heading");
  await page.getByLabel("Show this image").nth(1).selectOption({ label: 'Under "Fine tuning the details"' });

  // The mini outline shows where they land.
  const outline = page.locator("ol", { hasText: "Intro" });
  await expect(outline).toContainText(/Choosing a layout\s*▣ Image 1/);
  await expect(outline).toContainText(/Fine tuning the details\s*▣ Image 2/);

  // Preview renders through the site's MDX pipeline with both images.
  await page.getByRole("tab", { name: "Preview" }).click();
  await expect(page.locator(".site-preview figure")).toHaveCount(2);
  await page.getByRole("tab", { name: "Write" }).click();

  await page.getByRole("tab", { name: "Publish" }).click();
  await page.getByRole("button", { name: "Publish now" }).click();
  await expect(page.getByRole("region", { name: /Notifications/ }).getByText("Published", { exact: true })).toBeVisible();
  await expect(page).toHaveURL(/\/posts\/qa-guide-to-placed-images-/);
  const slug = new URL(page.url()).pathname.split("/").pop()!;

  const visitor = await browser.newPage();
  await visitor.goto(`${E2E_SITE_URL}/blog/${slug}`);
  await expect(visitor.getByRole("heading", { level: 1, name: TITLE })).toBeVisible();
  // Each image appears directly under the right heading.
  const order = await visitor.locator("article :is(h2, figure img)").evaluateAll((els) =>
    els.map((el) => (el.tagName === "IMG" ? `img:${el.getAttribute("alt")}` : el.textContent?.trim())),
  );
  expect(order.indexOf("img:Image placed in the middle of the post")).toBe(order.indexOf("Choosing a layout") + 1);
  expect(order.indexOf("img:Image placed under the fine tuning heading")).toBe(order.indexOf("Fine tuning the details") + 1);
  await visitor.goto(`${E2E_SITE_URL}/blog`);
  await expect(visitor.getByRole("link", { name: TITLE }).first()).toBeVisible();

  await page.getByRole("tab", { name: "Publish" }).click();
  await page.getByRole("button", { name: "Unpublish" }).click();
  await expect(page.getByText("Unpublished. It's a draft again.")).toBeVisible();
  const res = await visitor.goto(`${E2E_SITE_URL}/blog/${slug}`);
  expect(res?.status()).toBe(404);
  await visitor.close();
});

test("an image used in a post can't be deleted", async ({ page }) => {
  await signIn(page);
  await page.goto("/media");
  await page.getByRole("button", { name: `Open hero-${RUN}` }).first().click();
  await expect(page.getByText("Hero image")).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete image" })).toBeDisabled();
});

test("saving with missing fields lists what to fix", async ({ page }) => {
  await signIn(page);
  await page.goto("/posts/new");
  await page.getByLabel("Title").fill("Too short");
  await page.getByRole("tab", { name: "Publish" }).click();
  await page.getByRole("button", { name: "Save draft" }).click();
  const alert = page.getByRole("alert").filter({ hasText: "Please fix these before saving" });
  await expect(alert).toContainText("Hero image: Choose a hero image");
  await expect(alert).toContainText("Excerpt");
});
