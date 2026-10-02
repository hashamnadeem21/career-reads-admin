import { z } from "zod";

/** One password rule for sign-up (invites) and password changes. */
export const newPasswordSchema = z
  .string()
  .min(12, "Use at least 12 characters")
  .max(200)
  .refine((v) => /[a-zA-Z]/.test(v) && /[0-9\W_]/.test(v), "Mix letters with numbers or symbols");
