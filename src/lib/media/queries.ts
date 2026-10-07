import "server-only";
import { apiFetch } from "@/lib/api/client";

export interface MediaItem {
  id: string;
  url: string;
  /** Absolute URL for <img> in the admin (site-relative uploads resolve to the public site). */
  previewUrl: string;
  alt: string;
  width: number;
  height: number;
  sizeBytes: number;
  createdAt: string;
}

export const MEDIA_PAGE_SIZE = 48;

export function listMedia({ q, page = 1 }: { q?: string; page?: number }) {
  return apiFetch<{ items: MediaItem[]; total: number; page: number }>("/media", { query: { q, page } });
}

export interface MediaUsage {
  kind: "post" | "author";
  slug: string;
  title: string;
  where: string;
  href: string;
}

/** Every post (hero, extra images or body) and author photo that uses this image. */
export function getMediaUsage(id: string): Promise<MediaUsage[]> {
  return apiFetch<MediaUsage[]>(`/media/${encodeURIComponent(id)}/usage`);
}
