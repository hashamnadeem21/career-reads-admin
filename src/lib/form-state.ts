/** Shape returned by every form Server Action (used with useActionState). */
export interface FormState {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string[] | undefined>;
  /** Echo of submitted values so fields keep what the user typed after an error. */
  values?: Record<string, string>;
}

export const initialFormState: FormState = {};
