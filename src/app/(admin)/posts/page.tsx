import { Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { buttonClasses } from "@/components/admin/Button";
import { GlassPanel, PageHeader } from "@/components/admin/Glass";
import { Notice } from "@/components/admin/Notice";
import { PostsTable } from "@/components/posts/PostsTable";
import { ListToolbar } from "@/components/table/ListToolbar";
import { requireStaff } from "@/lib/auth/require-user";
import { articleState } from "@/lib/content-state";
import { getEditorOptions, listPosts, parsePostListParams, postStatusCounts } from "@/lib/posts/queries";
import { siteUrl } from "@/lib/site-url";

export const metadata: Metadata = { title: "Posts" };

export default async function PostsPage({ searchParams }: PageProps<"/posts">) {
  await requireStaff();
  const params = parsePostListParams(await searchParams);
  const [list, counts, options] = await Promise.all([listPosts(params), postStatusCounts(), getEditorOptions()]);
  const now = new Date();
  return (
    <>
      <Notice />
      <PageHeader
        title="Posts"
        description="Write, schedule and publish articles."
        actions={
          <Link href="/posts/new" className={buttonClasses({ variant: "primary" })}>
            <Plus /> New post
          </Link>
        }
      />
      <GlassPanel className="rise-in">
        <ListToolbar
          placeholder="Search title, slug or tag…"
          statuses={[
            { value: "", label: "All", count: counts.all },
            { value: "live", label: "Live", count: counts.live },
            { value: "draft", label: "Drafts", count: counts.draft },
            { value: "scheduled", label: "Scheduled", count: counts.scheduled },
          ]}
          categories={options.categories.map((c) => ({ value: c.slug, label: c.name }))}
        />
        <PostsTable
          filtered={Boolean(params.q || params.status || params.category)}
          pageInfo={{ page: list.page, pageSize: list.pageSize, total: list.total }}
          rows={list.rows.map((r) => ({
            slug: r.slug,
            title: r.title,
            category: r.categoryName ?? r.category,
            author: r.authorName ?? "",
            image: siteUrl(r.coverImage),
            publishedAt: r.publishedAt.toISOString(),
            savedAt: r.savedAt.toISOString(),
            state: articleState(r, now),
            featured: r.featured,
          }))}
        />
      </GlassPanel>
    </>
  );
}
