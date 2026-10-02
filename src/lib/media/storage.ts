import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, put } from "@vercel/blob";
import { env, isProduction } from "@/lib/env";
import { safeBaseName, type ImageType } from "./validate";

/**
 * Where uploads live:
 *  - BLOB_READ_WRITE_TOKEN set → Vercel Blob (CDN, https URL). Required in production.
 *  - local development → the public site's `public/uploads/` folder, served by both apps as /uploads/…
 */
export async function storeImage(bytes: Uint8Array, fileName: string, type: ImageType, contentType: string): Promise<string> {
  const name = `${safeBaseName(fileName)}-${randomBytes(8).toString("hex")}.${type}`;
  const { BLOB_READ_WRITE_TOKEN, BLOGNEST_DIR } = env();
  if (BLOB_READ_WRITE_TOKEN) {
    const blob = await put(`uploads/${name}`, Buffer.from(bytes), {
      access: "public",
      contentType,
      addRandomSuffix: false,
      token: BLOB_READ_WRITE_TOKEN,
      cacheControlMaxAge: 31_536_000,
    });
    return blob.url;
  }
  // Production must use Blob; local files are for development (and e2e tests that opt in explicitly).
  if (isProduction && process.env.ALLOW_LOCAL_UPLOADS !== "true") throw new Error("Uploads need BLOB_READ_WRITE_TOKEN in production.");
  const dir = path.resolve(BLOGNEST_DIR, "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
  return `/uploads/${name}`;
}

export async function removeImage(url: string): Promise<void> {
  const { BLOB_READ_WRITE_TOKEN, BLOGNEST_DIR } = env();
  if (/^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\//.test(url)) {
    if (BLOB_READ_WRITE_TOKEN) await del(url, { token: BLOB_READ_WRITE_TOKEN });
    return;
  }
  const match = /^\/uploads\/([a-z0-9-]+\.(?:jpg|png|webp|avif))$/.exec(url);
  if (match) await unlink(path.resolve(BLOGNEST_DIR, "public", "uploads", match[1])).catch(() => {});
}
