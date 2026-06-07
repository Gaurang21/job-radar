import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format, parseISO, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── JSON Helpers ─────────────────────────────────────────────

export function safeJsonParse<T>(str: string | null | undefined | T, fallback: T): T {
  if (str == null) return fallback;
  if (typeof str !== "string") return str as T;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

// ─── Date Helpers ─────────────────────────────────────────────

export function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Unknown";
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return "Unknown";
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "Unknown";
  }
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "Unknown";
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return "Unknown";
    return format(date, "MMM d, yyyy");
  } catch {
    return "Unknown";
  }
}

export function isClosingSoon(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return false;
    const diffDays = (date.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 3;
  } catch {
    return false;
  }
}

export function isWithinHours(dateStr: string | null | undefined, hours: number): boolean {
  if (!dateStr) return false;
  try {
    const date = parseISO(dateStr);
    if (!isValid(date)) return false;
    return Date.now() - date.getTime() < hours * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

// ─── Salary Helpers ───────────────────────────────────────────

export function formatSalary(
  min?: number | null,
  max?: number | null,
  currency = "USD"
): string {
  if (!min && !max) return "Salary not specified";
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
      notation: n >= 100000 ? "compact" : "standard",
    }).format(n);
  if (min && max) return `${fmt(min)} – ${fmt(max)}`;
  if (min) return `From ${fmt(min)}`;
  if (max) return `Up to ${fmt(max)}`;
  return "Salary not specified";
}

// ─── Score Helpers ────────────────────────────────────────────

export function getScoreColor(score: number | null | undefined): string {
  if (score == null) return "text-signal-muted";
  if (score >= 80) return "text-signal-success";
  if (score >= 50) return "text-signal-warning";
  return "text-signal-error";
}

export function getScoreLabel(score: number | null | undefined): string {
  if (score == null) return "Not scored";
  if (score >= 80) return "Strong Match";
  if (score >= 50) return "Moderate Match";
  return "Weak Match";
}

// ─── String Helpers ───────────────────────────────────────────

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "…";
}

export function generateExternalId(source: string, title: string, company: string, url: string): string {
  // Use URL as the canonical key when available — title can vary between fetches
  const key = url.trim() ? url.trim() : `${title}:${company}`;
  const base = `${source}:${key}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    const char = base.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `${source}_${Math.abs(hash)}`;
}

// ─── Job Normalizers ──────────────────────────────────────────

export function normalizeJobType(raw?: string | string[] | null): string | null {
  if (!raw) return null;
  const str = Array.isArray(raw) ? raw[0] : raw;
  if (!str || typeof str !== "string") return null;
  const lower = str.toLowerCase();
  if (lower.includes("remote")) return "remote";
  if (lower.includes("contract") || lower.includes("freelance")) return "contract";
  if (lower.includes("part")) return "part-time";
  return "full-time";
}

export function normalizeSeniority(title: string, raw?: string | null): string | null {
  const combined = `${title} ${raw ?? ""}`.toLowerCase();
  if (combined.includes("principal") || combined.includes("staff") || combined.includes("distinguished")) return "staff";
  if (combined.includes("lead") || combined.includes("manager")) return "lead";
  if (combined.includes("senior") || combined.includes(" sr ") || combined.includes("sr.")) return "senior";
  if (combined.includes("junior") || combined.includes(" jr ") || combined.includes("jr.") || combined.includes("entry")) return "junior";
  if (combined.includes("intern")) return "intern";
  return "mid";
}

// ─── DB row → camelCase ProfileShape helpers ─────────────────

export function rowToProfile(row: Record<string, unknown> | null): import("@/types").ParsedProfile | null {
  if (!row) return null;
  return {
    rawText: (row.raw_text as string) ?? "",
    skills: Array.isArray(row.skills) ? (row.skills as string[]) : safeJsonParse<string[]>(row.skills as string, []),
    titles: Array.isArray(row.titles) ? (row.titles as string[]) : safeJsonParse<string[]>(row.titles as string, []),
    experienceYears: (row.experience_years as number) ?? 0,
    education: Array.isArray(row.education) ? (row.education as import("@/types").Education[]) : safeJsonParse(row.education as string, []),
    location: (row.location as string) ?? undefined,
    desiredRole: (row.desired_role as string) ?? undefined,
    summary: (row.summary as string) ?? undefined,
    filePath: (row.file_path as string) ?? undefined,
    version: (row.version as number) ?? 1,
  };
}
