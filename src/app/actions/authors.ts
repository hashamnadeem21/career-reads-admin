"use server";

import { revalidatePath } from "next/cache";
import { apiFetch } from "@/lib/api/client";
import { type ActionResult, toResult } from "@/lib/api/results";
import { requireStaff } from "@/lib/auth/require-user";

export interface AuthorInput {
  originalSlug: string | null;
  slug: string;
  name: string;
  type: "Person" | "Organization";
  role: string;
  bio: string;
  avatar: string;
  links: { website: string; x: string; linkedin: string };
}

export type AuthorResult = ActionResult;

/** Validated by the API with the site's own authorSchema. Posts follow a renamed slug. */
export async function saveAuthor(input: AuthorInput): Promise<AuthorResult> {
  await requireStaff();
  const { originalSlug, ...body } = input;
  const result = await toResult(() =>
    apiFetch(originalSlug ? `/authors/${encodeURIComponent(originalSlug)}` : "/authors", {
      method: originalSlug ? "PATCH" : "POST",
      body,
    }),
  );
  if (result.ok) revalidatePath("/authors");
  return result;
}

export async function deleteAuthor(slug: string): Promise<AuthorResult> {
  await requireStaff();
  const result = await toResult(
    () => apiFetch(`/authors/${encodeURIComponent(slug)}`, { method: "DELETE" }),
    "Author deleted.",
  );
  if (result.ok) revalidatePath("/authors");
  return result;
}
