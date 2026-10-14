"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { ApiError, apiFetch } from "@/lib/api/client";
import { APPLICATION_STATUSES } from "@/lib/applications/types";
import { requireSuperAdmin, requireUser } from "@/lib/auth/require-user";

/**
 * Applications made on Career Reads. Open to every signed-in role: the API only lets company
 * accounts reach applications to their own company's jobs (anything else is a 404).
 */

type Result = { ok: boolean; message: string };

const idSchema = z.uuid();
const statusSchema = z.enum(APPLICATION_STATUSES);

function failure(error: unknown): Result {
  if (error instanceof ApiError) return { ok: false, message: error.fields.note ?? error.message };
  throw error;
}

export async function setApplicationStatus(id: string, status: string): Promise<Result> {
  await requireUser();
  try {
    const result = await apiFetch<{ message: string }>(`/applications/${idSchema.parse(id)}/status`, {
      method: "PATCH",
      body: { status: statusSchema.parse(status) },
    });
    revalidatePath("/applications");
    return { ok: true, ...result };
  } catch (error) {
    return failure(error);
  }
}

export async function bulkApplicationStatus(ids: string[], status: string): Promise<Result> {
  await requireUser();
  try {
    const result = await apiFetch<{ message: string }>("/applications/bulk-status", {
      method: "POST",
      body: { ids: z.array(idSchema).parse(ids), status: statusSchema.parse(status) },
    });
    revalidatePath("/applications");
    return { ok: true, ...result };
  } catch (error) {
    return failure(error);
  }
}

export async function addApplicationNote(id: string, note: string): Promise<Result> {
  await requireUser();
  try {
    await apiFetch(`/applications/${idSchema.parse(id)}/notes`, { method: "POST", body: { note } });
    revalidatePath(`/applications/${id}`);
    return { ok: true, message: "Note added." };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteApplication(id: string): Promise<Result> {
  await requireUser();
  try {
    await apiFetch(`/applications/${idSchema.parse(id)}`, { method: "DELETE" });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/applications");
  redirect("/applications?notice=deleted");
}

/** Super admin: delete everything held about one person, at their request. */
export async function forgetCandidate(email: string): Promise<Result> {
  await requireSuperAdmin();
  try {
    const result = await apiFetch<{ message: string }>("/applications/forget", { method: "POST", body: { email } });
    revalidatePath("/applications");
    return { ok: true, ...result };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, message: error.fields.email ?? error.message };
    throw error;
  }
}
