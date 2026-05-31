// ─── Auth ──────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  digest_opt_in: boolean;
}

// ─── Resume Profile ───────────────────────────────────────────

export interface ParsedProfile {
  rawText: string;
  skills: string[];
  titles: string[];
  experienceYears: number;
  education: Education[];
  location?: string;
  desiredRole?: string;
  summary?: string;
  filePath?: string | null;
  version?: number;
}

export interface Education {
  degree?: string;
  field?: string;
  school?: string;
}

// ─── Jobs ──────────────────────────────────────────────────────

export type JobSource = "adzuna" | "linkedin" | "indeed" | "manual";

export interface Job {
  id: string;
  user_id: string;
  external_id: string;
  title: string;
  company: string;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  job_type: string | null;
  seniority: string | null;
  description: string;
  requirements: string | null;
  responsibilities: string | null;
  application_url: string;
  source: JobSource;
  posted_date: string | null;
  closing_date: string | null;
  match_score: number;
  match_reasons: string[];
  why_match: string | null;
  ai_summary: JobSummary | null;
  skill_gaps: SkillGapResult | null;
  hiring_manager: string | null;
  hiring_manager_url: string | null;
  company_size: string | null;
  company_funding: string | null;
  company_industry: string | null;
  company_rating: number | null;
  duplicate_of: string | null;
  duplicate_sources: string[];
  saved: boolean;
  scored: boolean;
  resume_version: number | null;
  created_at: string;
  updated_at: string;
  pipeline_item?: PipelineItem | null;
}

export interface JobSummary {
  bullets: string[]; // 5 bullet points
}

export interface SkillGapResult {
  matched: string[];
  transferable: string[];
  missing: { skill: string; advice: string }[];
}

// ─── Pipeline ──────────────────────────────────────────────────

export type PipelineStage =
  | "saved"
  | "applied"
  | "phone_screen"
  | "interview"
  | "offer"
  | "rejected";

export const PIPELINE_STAGES: { id: PipelineStage; label: string; color: string }[] = [
  { id: "saved", label: "Saved", color: "cyan" },
  { id: "applied", label: "Applied", color: "blue" },
  { id: "phone_screen", label: "Phone Screen", color: "violet" },
  { id: "interview", label: "Interview", color: "amber" },
  { id: "offer", label: "Offer", color: "emerald" },
  { id: "rejected", label: "Rejected", color: "red" },
];

export interface PipelineItem {
  id: string;
  user_id: string;
  job_id: string;
  stage: PipelineStage;
  notes: string | null;
  deadline: string | null;
  created_at: string;
  updated_at: string;
  job?: Job;
  history?: PipelineHistoryEntry[];
}

export interface PipelineHistoryEntry {
  id: string;
  pipeline_item_id: string;
  from_stage: PipelineStage | null;
  to_stage: PipelineStage;
  created_at: string;
}

// ─── Notifications ─────────────────────────────────────────────

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  job_id: string | null;
  read: boolean;
  created_at: string;
}

// ─── AI Settings ──────────────────────────────────────────────

export interface AISettings {
  user_id: string;
  anthropic_api_key_encrypted: string | null;
  match_scoring_enabled: boolean;
  why_match_enabled: boolean;
  job_summary_enabled: boolean;
  skill_gap_enabled: boolean;
  cover_letter_enabled: boolean;
  interview_prep_enabled: boolean;
  email_draft_enabled: boolean;
  linkedin_analyzer_enabled: boolean;
  market_pulse_enabled: boolean;
  rejection_analyzer_enabled: boolean;
  cover_letter_tone: "formal" | "friendly" | "concise";
}

export type CoverLetterTone = "formal" | "friendly" | "concise";
export type EmailTone = "formal" | "casual";

// ─── ATS Score ─────────────────────────────────────────────────

export interface ATSScore {
  overallScore: number;
  keywordScore: number;
  skillsScore: number;
  experienceScore: number;
  formatScore: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  suggestions: Array<{ priority: "high" | "medium" | "low"; text: string }>;
  sectionScores: Array<{ section: string; score: number; feedback: string }>;
  summary: string;
}

// ─── AI Outputs ────────────────────────────────────────────────

export interface MatchResult {
  score: number;
  reasons: string[];
  whyMatch: string;
}

export interface InterviewPrepResult {
  questions: InterviewQuestion[];
}

export interface InterviewQuestion {
  question: string;
  category: "behavioral" | "technical" | "experience" | "company";
  framework: string;
}

export interface MarketPulse {
  summary: string;
  hotSkills: string[];
  salaryRange: string;
  insight: string;
  topCompanies: string[];
  generatedAt: string;
}

export interface RejectionPattern {
  patterns: string[];
  recommendations: string[];
  rejectionCount: number;
  overallInsight?: string;
}

export interface LinkedInAnalysis {
  overallScore: number;
  headline: string;
  strengths: string[];
  improvements: string[];
  keywords: string[];
  rewrittenAbout: string | null;
}

// ─── Filters / Sort ────────────────────────────────────────────

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

// ─── API Status / Errors ──────────────────────────────────────

export interface ApiErrorMessage {
  service: string;
  message: string;
  severity: "error" | "warning";
}

export interface ApiStatus {
  anthropic: "ok" | "error" | "unknown";
  adzuna: "ok" | "error" | "unknown";
  apify: "ok" | "error" | "unknown";
  resend: "ok" | "error" | "unknown";
  supabase: "ok" | "error" | "unknown";
  messages: ApiErrorMessage[];
}

// ─── Adzuna / Apify Raw Types ──────────────────────────────────

export interface AdzunaJob {
  id: string;
  title: string;
  description: string;
  created: string;
  redirect_url: string;
  salary_min?: number;
  salary_max?: number;
  location: { display_name: string };
  company: { display_name: string };
  contract_time?: string;
  contract_type?: string;
}

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

// ─── Processed Job (insert-ready) ─────────────────────────────

export interface ProcessedJob {
  external_id: string;
  title: string;
  company: string;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  job_type: string | null;
  seniority: string | null;
  description: string;
  application_url: string;
  source: JobSource;
  posted_date: string | null;
  hiring_manager?: string | null;
  hiring_manager_url?: string | null;
  company_size?: string | null;
  company_industry?: string | null;
}
