// ─── Core Domain Types ────────────────────────────────────────

export interface ParsedProfile {
  rawText: string;
  skills: string[];
  titles: string[];
  experienceYears: number;
  education: Education[];
  location?: string;
  desiredRole?: string;
  summary?: string;
}

export interface Education {
  degree?: string;
  field?: string;
  school?: string;
}

export interface Job {
  id: string;
  externalId: string;
  title: string;
  company: string;
  location?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  jobType?: string | null;
  seniority?: string | null;
  description: string;
  requirements?: string | null;
  responsibilities?: string | null;
  applicationUrl: string;
  source: JobSource;
  postedDate?: string | null;
  closingDate?: string | null;
  matchScore?: number | null;
  matchReasons?: string[] | null;
  whyMatch?: string | null;
  hiringManager?: string | null;
  hiringManagerUrl?: string | null;
  companySize?: string | null;
  companyFunding?: string | null;
  companyIndustry?: string | null;
  companyRating?: number | null;
  duplicateOf?: string | null;
  duplicateSources?: string[] | null;
  saved: boolean;
  scored: boolean;
  createdAt: string;
  updatedAt: string;
  pipelineItem?: PipelineItem | null;
}

export type JobSource = "adzuna" | "linkedin" | "indeed" | "manual";

export type PipelineStage =
  | "saved"
  | "applied"
  | "phone_screen"
  | "interview"
  | "offer"
  | "rejected";

export const PIPELINE_STAGES: { id: PipelineStage; label: string; color: string; icon: string }[] = [
  { id: "saved", label: "Saved", color: "cyan", icon: "Bookmark" },
  { id: "applied", label: "Applied", color: "blue", icon: "Send" },
  { id: "phone_screen", label: "Phone Screen", color: "violet", icon: "Phone" },
  { id: "interview", label: "Interview", color: "amber", icon: "Users" },
  { id: "offer", label: "Offer", color: "green", icon: "Trophy" },
  { id: "rejected", label: "Rejected", color: "red", icon: "XCircle" },
];

export interface PipelineItem {
  id: string;
  jobId: string;
  stage: PipelineStage;
  notes?: string | null;
  deadline?: string | null;
  createdAt: string;
  updatedAt: string;
  job?: Job;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  jobId?: string | null;
  read: boolean;
  createdAt: string;
}

// ─── API Response Types ────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface JobFilters {
  search?: string;
  jobType?: string;
  location?: string;
  seniority?: string;
  salaryMin?: number;
  salaryMax?: number;
  datePosted?: "24h" | "3d" | "7d" | "30d";
  source?: JobSource;
  minScore?: number;
  saved?: boolean;
}

export type JobSortBy = "newest" | "score" | "salary" | "relevance";

export interface DashboardStats {
  totalJobs: number;
  avgMatchScore: number;
  applied: number;
  interviews: number;
  offers: number;
  newSinceLastVisit: number;
  topMatches: Job[];
  apiStatus: ApiStatus;
}

export interface ApiStatus {
  anthropic: "ok" | "error" | "unknown";
  adzuna: "ok" | "error" | "unknown";
  apify: "ok" | "error" | "unknown";
  resend: "ok" | "error" | "unknown";
  messages: ApiErrorMessage[];
}

export interface ApiErrorMessage {
  service: string;
  message: string;
  severity: "error" | "warning";
}

// ─── Adzuna API Types ──────────────────────────────────────────

export interface AdzunaJob {
  id: string;
  title: string;
  description: string;
  created: string;
  redirect_url: string;
  salary_min?: number;
  salary_max?: number;
  location: {
    display_name: string;
  };
  company: {
    display_name: string;
  };
  contract_time?: string;
  contract_type?: string;
  category?: {
    tag: string;
    label: string;
  };
}

// ─── Apify Types ───────────────────────────────────────────────

export interface ApifyLinkedInJob {
  id?: string;
  title?: string;
  companyName?: string;
  location?: string;
  description?: string;
  url?: string;
  postedDate?: string;
  employmentType?: string;
  seniorityLevel?: string;
  salary?: string;
  companySize?: string;
  industry?: string;
}

export interface ApifyIndeedJob {
  id?: string;
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  url?: string;
  date?: string;
  jobType?: string;
  salary?: string;
}
