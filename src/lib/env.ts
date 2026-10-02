import { z } from "zod";

/**
 * Validated environment for the admin app. Read lazily so scripts and tests can
 * set process.env first. Never import this from a Client Component.
 */
const emptyToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(emptyToUndefined, schema.optional());

const envSchema = z.object({
  DATABASE_URL: z.string().regex(/^postgres(ql)?:\/\//, "DATABASE_URL must be a postgres:// connection string"),
  /** Public site origin, used for revalidation calls, "View on site" links and image previews. */
  PUBLIC_SITE_URL: z.preprocess(emptyToUndefined, z.url().default("http://localhost:3000")),
  /** Shared with the public site's /api/revalidate. */
  REVALIDATE_SECRET: optional(z.string().min(16)),
  /** Vercel Blob token for uploads. Without it, uploads are saved to .data/uploads in development. */
  BLOB_READ_WRITE_TOKEN: optional(z.string()),
  /** Folder of the public site repo, used by the content import script. */
  BLOGNEST_DIR: z.preprocess(emptyToUndefined, z.string().default("../blognest")),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
  cached = { ...parsed.data, PUBLIC_SITE_URL: parsed.data.PUBLIC_SITE_URL.replace(/\/+$/, "") };
  return cached;
}

export const isProduction = process.env.NODE_ENV === "production";
