import type { ApplicationStatus } from "@/lib/applications/types";

/** People with a candidate account on the website (they sign in to apply on Career Reads). */
export type SignupMethod = "google" | "password" | "apply";

export interface CandidateListItem {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  signupMethod: SignupMethod;
  emailVerified: boolean;
  accountCreatedAt: string;
  lastSignInAt: string | null;
  signInCount: number;
  applications: number;
  subscribed: boolean;
}

export interface CandidateStats {
  accounts: number;
  newThisWeek: number;
  google: number;
  password: number;
  subscribed: number;
  activeThisWeek: number;
}

export interface CandidateList {
  items: CandidateListItem[];
  total: number;
  page: number;
  pageSize: number;
  stats: CandidateStats;
}

export type CandidateEventKind = "signed_up" | "signed_in" | "signed_out" | "email_confirmed" | "password_reset" | "applied" | "subscribed";

export interface CandidateDetail {
  candidate: CandidateListItem;
  history: {
    id: number;
    kind: CandidateEventKind;
    method: SignupMethod | null;
    createdAt: string;
    job: { slug: string; title: string } | null;
  }[];
  applications: {
    id: string;
    status: ApplicationStatus;
    awaitingConfirmation: boolean;
    createdAt: string;
    job: { slug: string; title: string; company: string };
  }[];
}

export const METHOD_LABELS: Record<SignupMethod, string> = {
  google: "Google",
  password: "Email and password",
  apply: "Applied before accounts",
};
