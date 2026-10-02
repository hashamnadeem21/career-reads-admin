// Copied from blognest/src/lib/categories.ts by scripts/sync-shared.mjs. Do not edit here: change the site, then re-run `npm run sync:shared`.
export const CATEGORY_SLUGS = [
  "technology",
  "ai",
  "lifestyle",
  "productivity",
  "travel",
  "personal-development",
] as const;

export type CategorySlug = (typeof CATEGORY_SLUGS)[number];

export interface Category {
  slug: CategorySlug;
  name: string;
  /** Used in <title> and H1 of category pages. */
  headline: string;
  description: string;
  /** Tailwind gradient stops used for category accents. */
  accent: string;
}

export const categories: Record<CategorySlug, Category> = {
  technology: {
    slug: "technology",
    name: "Technology",
    headline: "Technology guides and explainers",
    description:
      "Plain-language explainers on the devices, software, and web technologies that shape everyday work and life.",
    accent: "from-sky-500 to-indigo-500",
  },
  ai: {
    slug: "ai",
    name: "AI",
    headline: "AI tools and practical AI guides",
    description:
      "Hands-on guides to AI tools, how they work, where they help, and where human judgment still matters most.",
    accent: "from-indigo-500 to-violet-500",
  },
  lifestyle: {
    slug: "lifestyle",
    name: "Lifestyle",
    headline: "Lifestyle ideas for calmer, healthier days",
    description:
      "Thoughtful ideas for home, health habits, and slowing down, written to be practical rather than aspirational.",
    accent: "from-rose-500 to-orange-400",
  },
  productivity: {
    slug: "productivity",
    name: "Productivity",
    headline: "Productivity systems that actually stick",
    description:
      "Systems, routines, and tools for doing focused work without burning out, tested against real schedules.",
    accent: "from-emerald-500 to-teal-500",
  },
  travel: {
    slug: "travel",
    name: "Travel",
    headline: "Travel planning tips and slow-travel guides",
    description:
      "Planning advice, packing strategies, and ways to travel more lightly, affordably, and respectfully.",
    accent: "from-amber-500 to-rose-500",
  },
  "personal-development": {
    slug: "personal-development",
    name: "Personal Development",
    headline: "Personal development and lifelong learning",
    description:
      "Evidence-informed approaches to learning, decision-making, habits, and growing a little every week.",
    accent: "from-violet-500 to-fuchsia-500",
  },
};

export const categoryList: Category[] = CATEGORY_SLUGS.map((slug) => categories[slug]);

export function isCategorySlug(value: string): value is CategorySlug {
  return (CATEGORY_SLUGS as readonly string[]).includes(value);
}

export function getCategory(slug: string): Category | undefined {
  return isCategorySlug(slug) ? categories[slug] : undefined;
}
