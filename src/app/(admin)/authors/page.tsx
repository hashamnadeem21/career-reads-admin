import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/Glass";
import { AuthorsManager } from "@/components/authors/AuthorsManager";
import { apiFetch } from "@/lib/api/client";
import type { AuthorRow } from "@/lib/api/types";
import { requireStaff } from "@/lib/auth/require-user";
import { env } from "@/lib/env";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = { title: "Authors" };

export default async function AuthorsPage() {
  await requireStaff();
  const rows = await apiFetch<(AuthorRow & { posts: number })[]>("/authors");
  return (
    <>
      <PageHeader title="Authors" description="Bylines with photo, bio and links. Shown on posts and author pages." />
      <AuthorsManager
        siteOrigin={env().PUBLIC_SITE_URL}
        authors={rows.map((a) => ({
          originalSlug: a.slug,
          slug: a.slug,
          name: a.name,
          type: a.type,
          role: a.role,
          bio: a.bio,
          avatar: a.avatar,
          avatarUrl: siteUrl(a.avatar),
          links: { website: a.links.website ?? "", x: a.links.x ?? "", linkedin: a.links.linkedin ?? "" },
          posts: a.posts,
        }))}
      />
    </>
  );
}
