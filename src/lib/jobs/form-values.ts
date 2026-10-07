/** Shape of the job form state (shared by the server pages and the client form). */
export interface JobFormValues {
  title: string;
  company: string;
  companyWebsite: string;
  slug: string;
  city: string;
  country: string;
  workModel: string;
  employmentType: string;
  category: string;
  experience: string;
  salary: string;
  summary: string;
  responsibilities: string[];
  requirements: string[];
  benefits: string[];
  applyUrl: string;
  applyEmail: string;
  postedAt: string;
  deadline: string;
  status: "draft" | "published";
  featured: boolean;
  /** Staff only: the company account that owns the job ("" = Career Reads). */
  companyId: string;
}

export const emptyJob = (): JobFormValues => ({
  title: "",
  company: "",
  companyWebsite: "",
  slug: "",
  city: "",
  country: "Pakistan",
  workModel: "on-site",
  employmentType: "full-time",
  category: "",
  experience: "entry",
  salary: "",
  summary: "",
  responsibilities: [""],
  requirements: [""],
  benefits: [],
  applyUrl: "",
  applyEmail: "",
  postedAt: new Date().toISOString().slice(0, 10),
  deadline: "",
  status: "draft",
  featured: false,
  companyId: "",
});
