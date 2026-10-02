import { Info, Lightbulb, TriangleAlert } from "lucide-react";
import { MDXRemote } from "next-mdx-remote-client/rsc";
import type { MDXComponents } from "next-mdx-remote-client/rsc";
import type { ComponentProps, ReactNode } from "react";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import { siteUrl } from "@/lib/site-url";
import { cn, formatDate } from "@/lib/utils";
import type { ArticleImage } from "@/shared/content/schema";
import { injectArticleImages, injectInArticleAd } from "@/shared/content/toc";

/*
 * Port of blognest/src/components/article/MdxContent.tsx for the editor preview.
 * Same MDX options (no imports/exports), plugins, components and image/ad injection,
 * so the preview matches the live page. Keep in sync with the site.
 */

const calloutStyles = {
  info: { Icon: Info, className: "border-sky-500/30 bg-sky-500/5", icon: "text-sky-600" },
  tip: { Icon: Lightbulb, className: "border-[#2563eb]/30 bg-[#2563eb]/5", icon: "text-[#1d4ed8]" },
  warning: { Icon: TriangleAlert, className: "border-amber-500/40 bg-amber-500/5", icon: "text-amber-600" },
} as const;

function Callout({ type = "info", title, children }: { type?: keyof typeof calloutStyles; title?: string; children: ReactNode }) {
  const { Icon, className, icon } = calloutStyles[type] ?? calloutStyles.info;
  return (
    <div role="note" className={cn("not-prose my-8 flex gap-3 rounded-2xl border p-5", className)}>
      <Icon className={cn("mt-0.5 h-5 w-5 shrink-0", icon)} aria-hidden />
      <div className="text-[0.95rem] leading-relaxed [&_p]:m-0">
        {title && <p className="mb-1 font-semibold">{title}</p>}
        <div className="opacity-90">{children}</div>
      </div>
    </div>
  );
}

function Correction({ date, children }: { date: string; children: ReactNode }) {
  return (
    <aside className="not-prose my-8 rounded-2xl border border-[#e2e8f0] bg-[#f8fafc] p-5 text-sm">
      <p className="font-semibold">
        Correction <span className="font-normal text-[#475569]">({formatDate(date)})</span>
      </p>
      <div className="mt-1 text-[#475569] [&_p]:m-0">{children}</div>
    </aside>
  );
}

function Figure({ src, alt, width, height, caption }: { src: string; alt: string; width: number; height: number; caption?: string }) {
  return (
    <figure className="not-prose my-10">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={siteUrl(src)} alt={alt} width={width} height={height} className="h-auto w-full rounded-2xl" />
      {caption && <figcaption className="mt-3 text-center text-sm text-[#475569]">{caption}</figcaption>}
    </figure>
  );
}

function PreviewLink({ href = "", children, ...rest }: ComponentProps<"a">) {
  const target = href.startsWith("/") ? siteUrl(href) : href;
  return (
    <a href={target} target="_blank" rel="noopener noreferrer" {...rest}>
      {children}
    </a>
  );
}

function AdPlaceholder() {
  return (
    <div className="not-prose my-8 flex min-h-[120px] items-center justify-center rounded-2xl border-2 border-dashed border-[#cbd5e1] text-xs font-semibold uppercase tracking-wider text-[#94a3b8]">
      In-article ad
    </div>
  );
}

function buildComponents(adsEnabled: boolean, images: ArticleImage[]): MDXComponents {
  return {
    a: PreviewLink,
    Callout,
    Correction,
    Figure,
    ArticleImage: ({ index }: { index: number }) => {
      const image = images[index];
      return image ? (
        <div className="relative">
          <span className="absolute left-3 top-3 z-10 rounded-full bg-[#2563eb] px-2.5 py-1 text-[11px] font-bold text-white shadow">Image {index + 1}</span>
          <Figure {...image} />
        </div>
      ) : null;
    },
    InArticleAd: () => (adsEnabled ? <AdPlaceholder /> : null),
    h1: (props: ComponentProps<"h2">) => <h2 {...props} />,
  };
}

export async function ArticleBody({ source, adsEnabled, images = [] }: { source: string; adsEnabled: boolean; images?: ArticleImage[] }) {
  const withImages = injectArticleImages(source, images);
  const prepared = adsEnabled ? injectInArticleAd(withImages) : withImages;
  return (
    <MDXRemote
      source={prepared}
      components={buildComponents(adsEnabled, images)}
      onError={({ error }) => (
        <div role="alert" className="not-prose rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-semibold">This post has a formatting problem and won&apos;t render.</p>
          <pre className="mt-2 whitespace-pre-wrap text-xs">{error.message}</pre>
        </div>
      )}
      options={{
        disableImports: true,
        disableExports: true,
        mdxOptions: { remarkPlugins: [remarkGfm], rehypePlugins: [rehypeSlug] },
      }}
    />
  );
}
