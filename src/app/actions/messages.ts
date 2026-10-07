"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiFetch } from "@/lib/api/client";
import { toResult } from "@/lib/api/results";
import { requireStaff } from "@/lib/auth/require-user";

const id = z.number().int().positive();

export async function setMessageRead(messageId: number, read: boolean): Promise<void> {
  await requireStaff();
  await apiFetch(`/messages/${id.parse(messageId)}`, { method: "PATCH", body: { read: z.boolean().parse(read) } });
  revalidatePath("/", "layout"); // unread badge in the sidebar
}

export async function deleteMessage(messageId: number): Promise<{ ok: boolean; message: string }> {
  await requireStaff();
  const result = await toResult(() => apiFetch(`/messages/${id.parse(messageId)}`, { method: "DELETE" }), "Message deleted.");
  revalidatePath("/", "layout");
  return result;
}

export async function deleteSubscribers(ids: number[]): Promise<{ ok: boolean; message: string }> {
  await requireStaff();
  const result = await toResult(() =>
    apiFetch("/subscribers", { method: "DELETE", body: { ids: z.array(id).min(1).max(500).parse(ids) } }),
  );
  revalidatePath("/messages");
  return result;
}
