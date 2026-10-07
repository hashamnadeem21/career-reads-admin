"use server";

import { apiFetch } from "@/lib/api/client";
import { requireUser } from "@/lib/auth/require-user";

export interface SearchHit {
  kind: "post" | "job";
  slug: string;
  title: string;
  href: string;
}

/** Title/slug search for the ⌘K palette: posts and jobs for staff, only their own jobs for companies. */
export async function searchEverything(query: string): Promise<SearchHit[]> {
  await requireUser();
  const q = query.trim().slice(0, 80);
  if (q.length < 2) return [];
  return apiFetch<SearchHit[]>("/search", { query: { q } });
}
