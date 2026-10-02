import { extractToc, injectArticleImages, placeableSectionIds } from "@/shared/content/toc";

export interface OutlineItem {
  kind: "intro" | "heading" | "image";
  text: string;
  depth?: 2 | 3;
  imageIndex?: number;
}

export const FIXED_PLACEMENTS = [
  { value: "after-intro", label: "After the intro" },
  { value: "middle", label: "Middle of the post" },
  { value: "before-conclusion", label: "Before the conclusion" },
] as const;

/** Options for the "Show this image" dropdown: the fixed spots plus one per ##/### heading. */
export function placementOptions(body: string): { value: string; label: string }[] {
  const ids = new Set(placeableSectionIds(body));
  const headings = extractToc(body).filter((h) => ids.has(h.id));
  return [
    ...FIXED_PLACEMENTS,
    ...headings.map((h) => ({ value: `section:${h.id}`, label: `Under "${h.text}"${h.depth === 3 ? " (sub-heading)" : ""}` })),
  ];
}

/**
 * The post's structure with each image where the site will put it, computed with
 * the site's own injectArticleImages so the mini outline can never disagree with it.
 */
export function buildOutline(body: string, images: { placement: string }[]): OutlineItem[] {
  const toc = extractToc(body);
  const lines = injectArticleImages(body, images).split(/\r?\n/);
  const items: OutlineItem[] = [{ kind: "intro", text: "Intro" }];
  let inFence = false;
  let headingIndex = 0;
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const marker = /^<ArticleImage index=\{(\d+)\} \/>$/.exec(line.trim());
    if (marker) {
      items.push({ kind: "image", text: `Image ${Number(marker[1]) + 1}`, imageIndex: Number(marker[1]) });
      continue;
    }
    const heading = /^(#{1,6})\s+/.exec(line);
    if (heading) {
      const depth = heading[1].length;
      if (depth === 2 || depth === 3) {
        const entry = toc[headingIndex++];
        if (entry) items.push({ kind: "heading", text: entry.text, depth: entry.depth });
      }
    }
  }
  return items;
}
