"use client";

import { FileText, Plus } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { bulkPosts } from "@/app/actions/posts";
import { StatusPill, type ContentState } from "@/components/admin/Badge";
import { Button, buttonClasses } from "@/components/admin/Button";
import { ConfirmDialog } from "@/components/admin/GlassDialog";
import { DataTable, type PageInfo } from "@/components/table/DataTable";
import { formatDate } from "@/lib/utils";

export interface PostListRow {
  slug: string;
  title: string;
  category: string;
  author: string;
  image: string;
  publishedAt: string;
  savedAt: string;
  state: ContentState;
  featured: boolean;
}

function Thumb({ src }: { src: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" className="h-10 w-14 shrink-0 rounded-lg bg-inset object-cover" />;
}

export function PostsTable({ rows, pageInfo, filtered }: { rows: PostListRow[]; pageInfo: PageInfo; filtered: boolean }) {
  const [pending, start] = useTransition();
  const bulk = (action: "publish" | "unpublish" | "delete", slugs: string[], clear: () => void) =>
    start(async () => {
      const r = await bulkPosts({ action, slugs });
      (r.ok ? toast.success : toast.error)(r.message);
      clear();
    });

  return (
    <DataTable
      label="Posts"
      rows={rows}
      getId={(r) => r.slug}
      getHref={(r) => `/posts/${r.slug}`}
      pageInfo={pageInfo}
      empty={
        filtered
          ? { icon: FileText, title: "No posts match these filters", description: "Try another search or clear the filters." }
          : {
              icon: FileText,
              title: "No posts yet",
              description: "Write your first post.",
              action: (
                <Link href="/posts/new" className={buttonClasses({ variant: "primary" })}>
                  <Plus /> New post
                </Link>
              ),
            }
      }
      columns={[
        {
          key: "title",
          header: "Post",
          sort: "title",
          cell: (r) => (
            <Link href={`/posts/${r.slug}`} tabIndex={-1} className="flex min-w-0 items-center gap-3 hover:text-primary">
              <Thumb src={r.image} />
              <span className="min-w-0">
                <span className="line-clamp-1 font-medium">
                  {r.title}
                  {r.featured && <span className="ml-2 text-xs font-semibold text-accent">Featured</span>}
                </span>
                <span className="block truncate text-xs text-muted">{r.author}</span>
              </span>
            </Link>
          ),
        },
        { key: "category", header: "Category", cell: (r) => <span className="text-muted">{r.category}</span>, className: "hidden lg:table-cell" },
        { key: "published", header: "Publish date", sort: "published", cell: (r) => <span className="whitespace-nowrap text-muted">{formatDate(r.publishedAt)}</span> },
        { key: "updated", header: "Last saved", sort: "updated", cell: (r) => <span className="whitespace-nowrap text-muted">{formatDate(r.savedAt)}</span>, className: "hidden xl:table-cell" },
        { key: "status", header: "Status", cell: (r) => <StatusPill state={r.state} /> },
      ]}
      renderCard={(r) => (
        <Link href={`/posts/${r.slug}`} className="glass-inset flex items-center gap-3 p-3">
          <Thumb src={r.image} />
          <span className="min-w-0 flex-1">
            <span className="line-clamp-1 text-sm font-medium">{r.title}</span>
            <span className="text-xs text-muted">
              {r.category} · {formatDate(r.publishedAt)}
            </span>
          </span>
          <StatusPill state={r.state} />
        </Link>
      )}
      bulkActions={(selected, clear) => (
        <>
          <Button size="sm" variant="primary" disabled={pending} onClick={() => bulk("publish", selected, clear)}>
            Publish
          </Button>
          <Button size="sm" disabled={pending} onClick={() => bulk("unpublish", selected, clear)}>
            Unpublish
          </Button>
          <ConfirmDialog
            trigger={
              <Button size="sm" variant="danger" disabled={pending}>
                Delete
              </Button>
            }
            title={`Delete ${selected.length} post${selected.length === 1 ? "" : "s"}?`}
            description="This can't be undone. Unpublish instead to keep them as drafts."
            onConfirm={() => bulk("delete", selected, clear)}
          />
        </>
      )}
    />
  );
}
