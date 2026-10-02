import "server-only";
import { getDb } from "@/db";
import { auditLog } from "@/db/schema";
import type { SessionUser } from "@/lib/auth/session";

export type AuditEntity = "job" | "post" | "category" | "author" | "media" | "settings" | "user" | "message" | "subscriber";

/** Records who changed what ("Hasham published Frontend Developer"). Never throws into the caller. */
export async function logAudit(user: Pick<SessionUser, "id">, action: string, entity: AuditEntity, entitySlug?: string | null, label?: string | null) {
  try {
    await getDb().insert(auditLog).values({ userId: user.id, action, entity, entitySlug: entitySlug ?? null, label: label ?? null });
  } catch (error) {
    console.error("Could not write audit log", error);
  }
}
