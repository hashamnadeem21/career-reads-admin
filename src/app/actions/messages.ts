"use server";

import { eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDb } from "@/db";
import { messages, subscribers } from "@/db/schema";
import { logAudit } from "@/lib/audit";
import { requireUser } from "@/lib/auth/require-user";

const id = z.number().int().positive();

export async function setMessageRead(messageId: number, read: boolean): Promise<void> {
  await requireUser();
  await getDb().update(messages).set({ read: z.boolean().parse(read) }).where(eq(messages.id, id.parse(messageId)));
  revalidatePath("/", "layout"); // unread badge in the sidebar
}

export async function deleteMessage(messageId: number): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const [row] = await getDb().delete(messages).where(eq(messages.id, id.parse(messageId))).returning();
  if (!row) return { ok: false, message: "Already deleted." };
  await logAudit(user, "deleted", "message", null, `message from ${row.name}`);
  revalidatePath("/", "layout");
  return { ok: true, message: "Message deleted." };
}

export async function deleteSubscribers(ids: number[]): Promise<{ ok: boolean; message: string }> {
  const user = await requireUser();
  const list = z.array(id).min(1).max(500).parse(ids);
  const rows = await getDb().delete(subscribers).where(inArray(subscribers.id, list)).returning();
  await logAudit(user, "removed", "subscriber", null, `${rows.length} subscriber${rows.length === 1 ? "" : "s"}`);
  revalidatePath("/messages");
  return { ok: true, message: `${rows.length} subscriber${rows.length === 1 ? "" : "s"} removed.` };
}
