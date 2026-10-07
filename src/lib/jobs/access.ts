import { eq, type SQL } from "drizzle-orm";
import { jobs, type JobReview } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session";

/**
 * Who may see and change which jobs, and what a save does to a job's status.
 * Every job query and action goes through these rules.
 */

type Actor = Pick<SessionUser, "role" | "companyId" | "companyAutoPublish">;

/**
 * SQL filter limiting a query to the jobs this user may see.
 * Staff see every job; a company account sees only its own company's jobs.
 */
export function jobScope(user: Actor): SQL | undefined {
  if (user.role !== "company") return undefined;
  if (!user.companyId) throw new Error("Company account without a company");
  return eq(jobs.companyId, user.companyId);
}

/** Same rule for a job row that is already loaded. */
export function canAccessJob(user: Actor, job: { companyId: string | null }): boolean {
  return user.role !== "company" || (user.companyId !== null && job.companyId === user.companyId);
}

export interface Publishing {
  status: "draft" | "published";
  review: JobReview | null;
}

/**
 * The status and review state that result when `user` saves a job asking for `requested`.
 *
 * Company accounts:
 *  - draft → hidden draft (any earlier review is cleared)
 *  - publish, trusted company → live immediately (approved)
 *  - publish, otherwise → stays hidden and goes to the review queue (pending).
 *    This also applies to edits of a job that is already live, so a listing can't be
 *    changed after approval without another review.
 *
 * Staff: what they choose. Publishing a company's job counts as approving it;
 * saving it as a draft keeps whatever review state it had.
 */
export function resolvePublishing(
  user: Actor,
  requested: "draft" | "published",
  job: { companyId: string | null; review: JobReview | null } | null,
): Publishing {
  if (user.role === "company") {
    if (requested === "draft") return { status: "draft", review: null };
    return user.companyAutoPublish ? { status: "published", review: "approved" } : { status: "draft", review: "pending" };
  }
  if (!job?.companyId) return { status: requested, review: null };
  return requested === "published" ? { status: "published", review: "approved" } : { status: "draft", review: job.review };
}
