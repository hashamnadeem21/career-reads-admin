import { z } from "zod";

/**
 * Validated environment for the admin app. Read lazily so scripts and tests can
 * set process.env first. Never import this from a Client Component.
 */
const emptyToUndefined = (value: unknown) => (typeof value === "string" && value.trim() === "" ? undefined : value);
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(emptyToUndefined, schema.optional());

/** The Career Reads API in production, used when API_URL isn't set on a Vercel production deployment. */
export const PRODUCTION_API_URL = "https://api.careersreads.com";

const envSchema = z.object({
  /** The Career Reads API (blognest-api). The admin has no database of its own. */
  API_URL: z.preprocess(
    (v) =>
      emptyToUndefined(v) ?? (process.env.VERCEL_ENV === "production" ? PRODUCTION_API_URL : "http://localhost:4000"),
    z.url().transform((v) => v.replace(/\/+$/, "")),
  ),
  /** Sent as X-Api-Key, so the API trusts X-Client-IP (login rate limits are per visitor). Same value as the API's ADMIN_API_KEY. */
  ADMIN_API_KEY: optional(z.string().min(32, "ADMIN_API_KEY must be at least 32 characters")),
  /** Public site origin, used for "View on site" links and image previews. */
  PUBLIC_SITE_URL: z.preprocess(
    emptyToUndefined,
    z
      .url()
      .default("http://localhost:3000")
      .transform((v) => v.replace(/\/+$/, "")),
  ),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
  cached = parsed.data;
  return cached;
}

export const isProduction = process.env.NODE_ENV === "production";
