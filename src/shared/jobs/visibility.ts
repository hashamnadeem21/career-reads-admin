// Copied from blognest/src/lib/jobs/visibility.ts by scripts/sync-shared.mjs. Do not edit here: change the site, then re-run `npm run sync:shared`.
import { isProduction } from "@/lib/env";
import type { Job } from "./schema";

/** The ONLY rule that decides whether a job is shown publicly. */
export function isJobVisible(
  job: Pick<Job, "status" | "postedAt" | "deadline" | "sample">,
  now: Date = new Date(),
  production: boolean = isProduction,
): boolean {
  if (job.status !== "published") return false;
  if (job.sample && production) return false;
  if (new Date(job.postedAt).getTime() > now.getTime()) return false;
  // A deadline is the last day to apply, so keep the job up until the end of that day (UTC).
  if (job.deadline && new Date(job.deadline).getTime() + 86_400_000 <= now.getTime()) return false;
  return true;
}
