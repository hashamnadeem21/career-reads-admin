import "server-only";
import { env } from "@/lib/env";

/** Absolute URL on the public site, for "View on site" links and site-relative images (/images/...). */
export function siteUrl(path = "/"): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${env().PUBLIC_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
