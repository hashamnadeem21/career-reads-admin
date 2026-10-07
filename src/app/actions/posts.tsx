"use server";

import { revalidatePath } from "next/cache";
import type { ReactNode } from "react";
import { z } from "zod";
import { ArticleBody } from "@/components/preview/ArticleBody";
import { ApiError, apiFetch } from "@/lib/api/client";
import { requireStaff } from "@/lib/auth/require-user";
import type { PostDraft, PostIntent } from "@/lib/posts/draft";
import { imagePlacementSchema, SLUG_PATTERN } from "@/shared/content/schema";

export interface SavePostResult {
  ok: boolean;
  slug?: string;
  status?: "draft" | "published";
  publishedAt?: string;
  savedAt?: string;
  errors?: Record<string, string>;
  message: string;
  /** False when the public site couldn't be told to refresh. */
  siteRefreshed?: boolean;
}

/** An API error as the `{ ok: false, message, errors? }` the editor shows. */
function failure(error: unknown): { ok: false; message: string; errors?: Record<string, string> } {
  if (!(error instanceof ApiError)) throw error;
  return { ok: false, message: error.message, ...(Object.keys(error.fields).length ? { errors: error.fields } : {}) };
}

/**
 * Create or update a post. The API validates it with the site's rules (frontmatter schema,
 * MDX check, category and author exist, unique slug), saves, audits and refreshes the site.
 */
export async function savePost(input: PostDraft, intent: PostIntent, scheduleAt?: string): Promise<SavePostResult> {
  await requireStaff();
  const { originalSlug, ...draft } = input;
  try {
    const result = await apiFetch<Omit<SavePostResult, "ok">>(
      originalSlug ? `/posts/${encodeURIComponent(originalSlug)}` : "/posts",
      { method: originalSlug ? "PATCH" : "POST", body: { ...draft, intent, scheduleAt } },
    );
    if (intent !== "autosave") revalidatePath("/", "layout");
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof ApiError && error.status === 404 && originalSlug) {
      return { ok: false, message: "This post no longer exists. It may have been deleted." };
    }
    return failure(error);
  }
}

/** Preview accepts work-in-progress images (alt text may still be short); unknown keys are dropped. */
const previewImages = z
  .array(
    z.object({
      src: z.string().regex(/^\/|^https:\/\//).max(500),
      alt: z.string().max(500).default(""),
      caption: z.string().max(500).optional(),
      width: z.number().int().positive().max(20000).default(1600),
      height: z.number().int().positive().max(20000).default(900),
      placement: imagePlacementSchema.default("middle"),
    }),
  )
  .max(3);

/** Renders the post body through the same MDX pipeline the site uses. */
export async function renderPostPreview(body: string, images: unknown, ads: boolean): Promise<ReactNode> {
  await requireStaff();
  const source = z.string().max(200_000).parse(body);
  const parsedImages = previewImages.safeParse(images);
  const safeImages = parsedImages.success ? parsedImages.data.map((i) => ({ ...i, caption: i.caption || undefined })) : [];
  return <ArticleBody source={source} adsEnabled={ads} images={safeImages} />;
}

const slugSchema = z.string().regex(SLUG_PATTERN).max(100);

export async function deletePost(slug: string): Promise<{ ok: boolean; message: string }> {
  await requireStaff();
  try {
    await apiFetch(`/posts/${slugSchema.parse(slug)}`, { method: "DELETE" });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Post deleted." };
}

export async function duplicatePost(slug: string): Promise<{ ok: boolean; slug?: string; message: string }> {
  await requireStaff();
  try {
    const copy = await apiFetch<{ slug: string; message: string }>(`/posts/${slugSchema.parse(slug)}/duplicate`, {
      method: "POST",
    });
    return { ok: true, ...copy };
  } catch (error) {
    return failure(error);
  }
}

export async function bulkPosts(input: { action: string; slugs: string[] }): Promise<{ ok: boolean; message: string }> {
  await requireStaff();
  try {
    const { message } = await apiFetch<{ message: string }>("/posts/bulk", { method: "POST", body: input });
    revalidatePath("/", "layout");
    return { ok: true, message };
  } catch (error) {
    return failure(error);
  }
}
