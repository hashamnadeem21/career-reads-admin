import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/Glass";
import { PostEditor } from "@/components/posts/PostEditor";
import { requireUser } from "@/lib/auth/require-user";
import { env } from "@/lib/env";
import { getEditorOptions } from "@/lib/posts/queries";

export const metadata: Metadata = { title: "New post" };

export default async function NewPostPage() {
  await requireUser();
  const { categories, authors } = await getEditorOptions();
  return (
    <>
      <PageHeader title="New post" />
      <PostEditor
        siteOrigin={env().PUBLIC_SITE_URL}
        categories={categories}
        authors={authors}
        initial={{
          originalSlug: null,
          slug: "",
          title: "",
          excerpt: "",
          body: "",
          category: "",
          tags: [],
          author: authors.length === 1 ? authors[0].slug : "",
          coverImage: "",
          coverAlt: "",
          coverWidth: 1600,
          coverHeight: 900,
          images: [],
          seoTitle: "",
          seoDescription: "",
          canonicalUrl: "",
          noindex: false,
          ads: true,
          featured: false,
          trending: false,
          editorsPick: false,
          status: "draft",
          publishedAt: "",
        }}
      />
    </>
  );
}
