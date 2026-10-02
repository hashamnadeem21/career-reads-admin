"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { media } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/require-user";
import { getMediaUsage, listMedia, toMediaItem, type MediaItem, type MediaUsage } from "@/lib/media/queries";
import { removeImage, storeImage } from "@/lib/media/storage";
import { checkImage } from "@/lib/media/validate";
import { rateLimit } from "@/lib/rate-limit";

export interface UploadResult {
  uploaded: MediaItem[];
  errors: { name: string; error: string }[];
}

const altSchema = z.string().trim().max(200);

/** Upload one or more images (field "files"). Each is checked by its bytes, max 5 MB. */
export async function uploadImages(formData: FormData): Promise<UploadResult> {
  const user = await requireUser();
  const limit = await rateLimit(`upload:${user.id}`, 60, 600);
  if (!limit.allowed) return { uploaded: [], errors: [{ name: "Upload", error: "Too many uploads. Please wait a few minutes." }] };

  const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 20);
  const alt = altSchema.safeParse(formData.get("alt") ?? "");
  const result: UploadResult = { uploaded: [], errors: [] };

  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const check = checkImage(bytes);
    if (!check.ok) {
      result.errors.push({ name: file.name, error: check.error });
      continue;
    }
    try {
      const url = await storeImage(bytes, file.name, check.type, check.contentType);
      const [row] = await getDb()
        .insert(media)
        .values({ url, alt: alt.success ? alt.data : "", width: check.width, height: check.height, sizeBytes: bytes.byteLength, uploadedBy: user.id })
        .returning();
      result.uploaded.push(toMediaItem(row));
      await logAudit(user, "uploaded", "media", row.id, file.name.slice(0, 80));
    } catch (error) {
      console.error("Upload failed", error);
      result.errors.push({ name: file.name, error: "Couldn't save this image. Try again." });
    }
  }
  if (result.uploaded.length) revalidatePath("/media");
  return result;
}

export async function searchMedia(q: string, page = 1): Promise<{ items: MediaItem[]; total: number }> {
  await requireUser();
  const { items, total } = await listMedia({ q: q.trim().slice(0, 80) || undefined, page: Math.max(1, Math.floor(page)) });
  return { items, total };
}

export async function updateMediaAlt(id: string, alt: string): Promise<{ ok: boolean; message: string }> {
  await requireUser();
  const parsed = altSchema.safeParse(alt);
  if (!parsed.success) return { ok: false, message: "Alt text must be 200 characters or fewer." };
  await getDb().update(media).set({ alt: parsed.data }).where(eq(media.id, z.uuid().parse(id)));
  revalidatePath("/media");
  return { ok: true, message: "Alt text saved." };
}

export async function mediaUsage(url: string): Promise<MediaUsage[]> {
  await requireUser();
  return getMediaUsage(z.string().max(500).parse(url));
}

/** Deletes an image only when no post or author uses it. */
export async function deleteMedia(id: string): Promise<{ ok: boolean; message: string; usage?: MediaUsage[] }> {
  const user = await requireUser();
  const [row] = await getDb().select().from(media).where(eq(media.id, z.uuid().parse(id))).limit(1);
  if (!row) return { ok: false, message: "This image was already deleted." };
  const usage = await getMediaUsage(row.url);
  if (usage.length) {
    return { ok: false, message: `Still used in ${usage.length} place${usage.length === 1 ? "" : "s"}. Replace it there first.`, usage };
  }
  await getDb().delete(media).where(eq(media.id, row.id));
  await removeImage(row.url);
  await logAudit(user, "deleted", "media", null, row.url.split("/").pop());
  revalidatePath("/media");
  return { ok: true, message: "Image deleted." };
}
