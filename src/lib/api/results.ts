import "server-only";
import { ApiError } from "./client";

/** The `{ ok, message, errors? }` result most admin actions return. */
export interface ActionResult {
  ok: boolean;
  message: string;
  errors?: Record<string, string>;
}

/** Runs an API call; an API error becomes `{ ok: false, message, errors }` for the form. */
export async function toResult(call: () => Promise<{ message: string } | void>, success?: string): Promise<ActionResult> {
  try {
    const result = await call();
    return { ok: true, message: success ?? (result && "message" in result ? result.message : "Saved.") };
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return { ok: false, message: error.message, ...(Object.keys(error.fields).length ? { errors: error.fields } : {}) };
  }
}
