import { asc, count } from "drizzle-orm";
import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/Glass";
import { AuthorsManager } from "@/components/authors/AuthorsManager";
import { getDb } from "@/db";
import { articles, authors } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { env } from "@/lib/env";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = { title: "Authors" };

export default async function AuthorsPage() {
  await requireUser();
  const db = getDb();
  const [rows, counts] = await Promise.all([
    db.select().from(authors).orderBy(asc(authors.name)),
    db.select({ slug: articles.author, n: count() }).from(articles).groupBy(articles.author),
  ]);
  const posts = new Map(counts.map((c) => [c.slug, c.n]));
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
          posts: posts.get(a.slug) ?? 0,
        }))}
      />
    </>
  );
}
