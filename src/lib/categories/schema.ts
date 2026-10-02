import { z } from "zod";
import { SLUG_PATTERN } from "@/shared/content/schema";

/** Accent gradients the site knows how to render for blog categories. */
export const CATEGORY_ACCENTS = [
  { value: "from-sky-500 to-indigo-500", label: "Sky → Indigo" },
  { value: "from-indigo-500 to-violet-500", label: "Indigo → Violet" },
  { value: "from-rose-500 to-orange-400", label: "Rose → Orange" },
  { value: "from-emerald-500 to-teal-500", label: "Emerald → Teal" },
  { value: "from-amber-500 to-rose-500", label: "Amber → Rose" },
  { value: "from-violet-500 to-fuchsia-500", label: "Violet → Fuchsia" },
] as const;

export const categoryInputSchema = z
  .object({
    originalSlug: z.string().max(80).nullable(),
    kind: z.enum(["blog", "job"]),
    slug: z.string().trim().regex(SLUG_PATTERN, "Use lowercase letters, numbers and dashes").max(60),
    name: z.string().trim().min(2, "At least 2 characters").max(40),
    headline: z.string().trim().max(110),
    description: z.string().trim().min(20, "At least 20 characters").max(300),
    accent: z.string().max(80),
  })
  .superRefine((v, ctx) => {
    if (v.kind === "blog" && v.headline.length < 10) {
      ctx.addIssue({ code: "custom", path: ["headline"], message: "Blog categories need a headline (10+ characters) for their page title" });
    }
    if (v.kind === "blog" && !CATEGORY_ACCENTS.some((a) => a.value === v.accent)) {
      ctx.addIssue({ code: "custom", path: ["accent"], message: "Pick an accent colour" });
    }
  });
export type CategoryInput = z.infer<typeof categoryInputSchema>;
