"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api/client";
import { type ActionResult, toResult } from "@/lib/api/results";
import { requireStaff } from "@/lib/auth/require-user";
import type { CategoryInput } from "@/lib/categories/schema";

export type CategoryResult = ActionResult;

/** Create or update. A renamed slug follows into posts and jobs; the API refreshes the site. */
export async function saveCategory(input: CategoryInput): Promise<CategoryResult> {
  await requireStaff();
  const { originalSlug, ...body } = input;
  const result = await toResult(() =>
    apiFetch(originalSlug ? `/categories/${encodeURIComponent(originalSlug)}` : "/categories", {
      method: originalSlug ? "PATCH" : "POST",
      body,
    }),
  );
  if (result.ok) revalidatePath("/categories");
  return result;
}

export async function reorderCategories(kind: "blog" | "job", slugs: string[]): Promise<CategoryResult> {
  await requireStaff();
  const result = await toResult(() => apiFetch("/categories/reorder", { method: "POST", body: { kind, slugs } }));
  if (result.ok) revalidatePath("/categories");
  return result;
}

/** Deleting is blocked while any post or job uses the category. */
export async function deleteCategory(slug: string): Promise<CategoryResult> {
  await requireStaff();
  const result = await toResult(
    () => apiFetch(`/categories/${encodeURIComponent(slug)}`, { method: "DELETE" }),
    "Category deleted.",
  );
  if (result.ok) revalidatePath("/categories");
  return result;
}
