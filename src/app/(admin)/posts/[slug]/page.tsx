import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/Glass";
import { PostEditor } from "@/components/posts/PostEditor";
import { requireStaff } from "@/lib/auth/require-user";
import { env } from "@/lib/env";
import { getEditorOptions, getPost } from "@/lib/posts/queries";

export async function generateMetadata({ params }: PageProps<"/posts/[slug]">): Promise<Metadata> {
  const post = await getPost((await params).slug);
  return { title: post ? `Edit: ${post.title}` : "Post not found" };
}

export default async function EditPostPage({ params }: PageProps<"/posts/[slug]">) {
  await requireStaff();
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const { categories, authors } = await getEditorOptions();
  return (
    <>
      <PageHeader title="Edit post" />
      <PostEditor
        key={post.slug}
        siteOrigin={env().PUBLIC_SITE_URL}
        categories={categories}
        authors={authors}
        initial={{
          originalSlug: post.slug,
          slug: post.slug,
          title: post.title,
          excerpt: post.excerpt,
          body: post.body,
          category: post.category,
          tags: post.tags,
          author: post.author,
          coverImage: post.coverImage,
          coverAlt: post.coverAlt,
          coverWidth: post.coverWidth,
          coverHeight: post.coverHeight,
          images: post.images.map((i) => ({ src: i.src, alt: i.alt, caption: i.caption ?? "", width: i.width, height: i.height, placement: i.placement })),
          seoTitle: post.seoTitle ?? "",
          seoDescription: post.seoDescription ?? "",
          canonicalUrl: post.canonicalUrl ?? "",
          noindex: post.noindex,
          ads: post.ads,
          featured: post.featured,
          trending: post.trending,
          editorsPick: post.editorsPick,
          status: post.status,
          publishedAt: post.publishedAt.toISOString(),
        }}
      />
    </>
  );
}
