"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApiError, apiFetch } from "@/lib/api/client";
import { requireStaff } from "@/lib/auth/require-user";
import { getMediaUsage, listMedia, type MediaItem, type MediaUsage } from "@/lib/media/queries";

export interface UploadResult {
  uploaded: MediaItem[];
  errors: { name: string; error: string }[];
}

const altSchema = z.string().trim().max(200);

/**
 * Upload one or more images (field "files"). The API checks each by its bytes (JPG, PNG, WebP
 * or AVIF, max 5 MB) and stores it in Vercel Blob (or the website's public/uploads locally).
 */
export async function uploadImages(formData: FormData): Promise<UploadResult> {
  await requireStaff();
  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 20);
  if (!files.length) return { uploaded: [], errors: [] };
  const alt = altSchema.safeParse(formData.get("alt") ?? "");
  const body = new FormData();
  for (const file of files) body.append("files", file, file.name);
  body.append("alt", alt.success ? alt.data : "");
  try {
    const result = await apiFetch<UploadResult>("/media", { method: "POST", body });
    if (result.uploaded.length) revalidatePath("/media");
    return result;
  } catch (error) {
    // Too many uploads (429) or a file over 5 MB (413) fail the whole upload.
    if (error instanceof ApiError) return { uploaded: [], errors: [{ name: "Upload", error: error.message }] };
    throw error;
  }
}

export async function searchMedia(q: string, page = 1): Promise<{ items: MediaItem[]; total: number }> {
  await requireStaff();
  const { items, total } = await listMedia({ q: q.trim().slice(0, 80) || undefined, page: Math.max(1, Math.floor(page)) });
  return { items, total };
}

export async function updateMediaAlt(id: string, alt: string): Promise<{ ok: boolean; message: string }> {
  await requireStaff();
  const parsed = altSchema.safeParse(alt);
  if (!parsed.success) return { ok: false, message: "Alt text must be 200 characters or fewer." };
  try {
    const { message } = await apiFetch<{ message: string }>(`/media/${z.uuid().parse(id)}`, {
      method: "PATCH",
      body: { alt: parsed.data },
    });
    revalidatePath("/media");
    return { ok: true, message };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message };
    throw error;
  }
}

export async function mediaUsage(id: string): Promise<MediaUsage[]> {
  await requireStaff();
  return getMediaUsage(z.uuid().parse(id));
}

/** Deletes an image only when no post or author uses it. */
export async function deleteMedia(id: string): Promise<{ ok: boolean; message: string; usage?: MediaUsage[] }> {
  await requireStaff();
  try {
    await apiFetch(`/media/${z.uuid().parse(id)}`, { method: "DELETE" });
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    const usage = (error.details as { usage?: MediaUsage[] } | undefined)?.usage;
    return { ok: false, message: error.message, ...(usage ? { usage } : {}) };
  }
  revalidatePath("/media");
  return { ok: true, message: "Image deleted." };
}
