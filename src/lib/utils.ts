import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format, parseISO, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── JSON Helpers ─────────────────────────────────────────────

export function safeJsonParse<T>(str: string | null | undefined, fallback: T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch {
    return fallback;
  }
}

export function safeJsonStringify(val: unknown): string {
  try {
    return JSON.stringify(val);
  } catch {
    return "[]";
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
    const now = new Date();
    const diffDays = (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    return diffDays >= 0 && diffDays <= 3;
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

export function getScoreBg(score: number | null | undefined): string {
  if (score == null) return "bg-signal-muted/20";
  if (score >= 80) return "bg-signal-success/20 border-signal-success/40";
  if (score >= 50) return "bg-signal-warning/20 border-signal-warning/40";
  return "bg-signal-error/20 border-signal-error/40";
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
  const base = `${source}:${title}:${company}:${url}`;
  let hash = 0;
  for (let i = 0; i < base.length; i++) {
    const char = base.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return `${source}_${Math.abs(hash)}`;
}

export function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

// ─── Job Type / Seniority Normalizers ────────────────────────

export function normalizeJobType(raw?: string | null): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
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
