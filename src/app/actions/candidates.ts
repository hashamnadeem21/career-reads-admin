"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ApiError, apiFetch } from "@/lib/api/client";
import { requireSuperAdmin } from "@/lib/auth/require-user";

type Result = { ok: true; message: string } | { ok: false; message: string };

/** Super admin: deletes a candidate's account, sign-in history, applications and CVs, and newsletter subscription. */
export async function deleteCandidate(id: string): Promise<Result> {
  await requireSuperAdmin();
  const parsed = z.uuid().safeParse(id);
  if (!parsed.success) return { ok: false, message: "That candidate doesn't exist." };
  try {
    const result = await apiFetch<{ message: string }>(`/candidates/${parsed.data}`, { method: "DELETE" });
    revalidatePath("/candidates");
    revalidatePath("/applications");
    return { ok: true, message: result.message };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.message };
    throw error;
  }
}
