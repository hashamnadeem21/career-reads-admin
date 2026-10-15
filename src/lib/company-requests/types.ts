export type CompanyRequestStatus = "pending" | "approved" | "rejected";

export interface CompanyRequestListItem {
  id: string;
  companyName: string;
  industry: string;
  companySize: string;
  location: string;
  contactName: string;
  contactEmail: string;
  contactRole: string;
  status: CompanyRequestStatus;
  createdAt: string;
  reviewedAt: string | null;
}

export interface CompanyRequestList {
  items: CompanyRequestListItem[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<CompanyRequestStatus, number>;
}

export interface CompanyRequestDetail {
  request: CompanyRequestListItem & {
    website: string | null;
    contactPhone: string;
    hiringPlans: string | null;
    reviewNote: string | null;
    companyId: string | null;
    reviewedByName: string | null;
    approvedCompanyName: string | null;
  };
  checks: { emailHasAccount: boolean; companyNameTaken: boolean; previousRequests: number };
}

export const STATUS_LABELS: Record<CompanyRequestStatus, string> = { pending: "Waiting", approved: "Approved", rejected: "Turned down" };

/** The API stores sizes as ranges ("51-200"). */
export const sizeLabel = (size: string) => (size.endsWith("+") ? `${size.slice(0, -1)}+ people` : `${size.replace("-", "–")} people`);
