import "server-only";
import { env } from "@/lib/env";

export type SiteCacheTag = "articles" | "authors" | "jobs" | "categories" | "settings";

/**
 * Tells the public site to refresh after a save (POST /api/revalidate with the shared secret).
 * Never throws: a failed refresh must not undo a successful save, so it reports instead.
 */
export async function revalidateSite(input: { tags?: SiteCacheTag[]; paths?: string[] }): Promise<{ ok: boolean; error?: string }> {
  const { PUBLIC_SITE_URL, REVALIDATE_SECRET } = env();
  if (!REVALIDATE_SECRET) return { ok: false, error: "REVALIDATE_SECRET is not set" };
  try {
    const res = await fetch(`${PUBLIC_SITE_URL}/api/revalidate`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${REVALIDATE_SECRET}` },
      body: JSON.stringify({ tags: input.tags ?? [], paths: [...new Set(input.paths ?? [])] }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { ok: false, error: `Site answered ${res.status}` };
    return { ok: true };
  } catch (error) {
    console.error("Could not revalidate the public site", error);
    return { ok: false, error: "The public site could not be reached" };
  }
}
