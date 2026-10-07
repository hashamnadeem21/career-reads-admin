import type { Metadata } from "next";
import { GlassPanel, PageHeader } from "@/components/admin/Glass";
import { CategoriesManager, type CategoryItem } from "@/components/categories/CategoriesManager";
import { apiFetch } from "@/lib/api/client";
import type { CategoryRow } from "@/lib/api/types";
import { requireStaff } from "@/lib/auth/require-user";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireStaff();
  // In display order, each with how many posts or jobs use it.
  const rows = await apiFetch<(CategoryRow & { used: number })[]>("/categories");
  const items: CategoryItem[] = rows.map((r) => ({
    slug: r.slug,
    kind: r.kind,
    name: r.name,
    headline: r.headline ?? "",
    description: r.description,
    accent: r.accent ?? "",
    usage: r.used,
  }));
  return (
    <>
      <PageHeader title="Categories" description="Blog topics and job categories shown across the site." />
      <GlassPanel className="rise-in">
        <CategoriesManager blog={items.filter((i) => i.kind === "blog")} job={items.filter((i) => i.kind === "job")} />
      </GlassPanel>
    </>
  );
}

