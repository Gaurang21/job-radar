import type { AdzunaJob, ParsedProfile } from "@/types";
import { generateExternalId, normalizeJobType, normalizeSeniority } from "./utils";

const APP_ID = process.env.ADZUNA_APP_ID;
const APP_KEY = process.env.ADZUNA_APP_KEY;
const COUNTRY = process.env.ADZUNA_COUNTRY || "us";
const BASE_URL = `https://api.adzuna.com/v1/api/jobs/${COUNTRY}`;

export interface AdzunaFetchResult {
  jobs: ProcessedJob[];
  error?: string;
  count: number;
}

export interface ProcessedJob {
  externalId: string;
  title: string;
  company: string;
  location: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  jobType: string | null;
  seniority: string | null;
  description: string;
  applicationUrl: string;
  source: "adzuna";
  postedDate: string | null;
}

export async function fetchAdzunaJobs(
  profile: ParsedProfile,
  maxJobs = 50
): Promise<AdzunaFetchResult> {
  if (!APP_ID || !APP_KEY) {
    return {
      jobs: [],
      error: "Adzuna API credentials not configured",
      count: 0,
    };
  }

  try {
    // Build search query from profile
    const searchTerms = buildSearchQuery(profile);
    const pages = Math.min(Math.ceil(maxJobs / 10), 5);
    const allJobs: ProcessedJob[] = [];
    const seenIds = new Set<string>();

    for (let page = 1; page <= pages; page++) {
      const params = new URLSearchParams({
        app_id: APP_ID,
        app_key: APP_KEY,
        results_per_page: "10",
        page: String(page),
        what: searchTerms,
        content_type: "application/json",
        full_description: "1",
      });

      if (profile.location) {
        params.append("where", profile.location);
      }

      const response = await fetch(
        `${BASE_URL}/search/1?${params.toString()}`,
        {
          headers: { "User-Agent": "JobRadar/1.0" },
          signal: AbortSignal.timeout(15000),
        }
      );

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return {
            jobs: allJobs,
            error: "Adzuna API key is invalid or unauthorized",
            count: allJobs.length,
          };
        }
        if (response.status === 429) {
          return {
            jobs: allJobs,
            error: "Adzuna daily limit (250 requests) reached. Resets at midnight.",
            count: allJobs.length,
          };
        }
        throw new Error(`Adzuna API error: ${response.status}`);
      }

      const data = await response.json();
      const results: AdzunaJob[] = data.results || [];

      for (const job of results) {
        const externalId = generateExternalId("adzuna", job.title, job.company?.display_name ?? "", job.redirect_url);
        if (seenIds.has(externalId)) continue;
        seenIds.add(externalId);

        allJobs.push({
          externalId,
          title: job.title,
          company: job.company?.display_name ?? "Unknown Company",
          location: job.location?.display_name ?? null,
          salaryMin: job.salary_min ?? null,
          salaryMax: job.salary_max ?? null,
          salaryCurrency: "USD",
          jobType: normalizeJobType(job.contract_time ?? job.contract_type),
          seniority: normalizeSeniority(job.title),
          description: job.description,
          applicationUrl: job.redirect_url,
          source: "adzuna",
          postedDate: job.created ?? null,
        });
      }

      if (results.length < 10) break; // No more results
    }

    return { jobs: allJobs, count: allJobs.length };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return {
      jobs: [],
      error: `Adzuna fetch failed: ${message}`,
      count: 0,
    };
  }
}

function buildSearchQuery(profile: ParsedProfile): string {
  const parts: string[] = [];

  // Add desired role first
  if (profile.desiredRole) {
    parts.push(profile.desiredRole);
  } else if (profile.titles.length > 0) {
    parts.push(profile.titles[0]);
  }

  // Add top technical skills (first 5)
  const techSkills = profile.skills
    .filter((s) => isTechSkill(s))
    .slice(0, 5);
  parts.push(...techSkills);

  return parts.slice(0, 3).join(" ");
}

function isTechSkill(skill: string): boolean {
  const techKeywords = [
    "javascript", "typescript", "python", "java", "react", "node", "angular",
    "vue", "next", "aws", "azure", "gcp", "docker", "kubernetes", "sql",
    "mongodb", "postgres", "graphql", "rest", "api", "ml", "ai", "data",
    "golang", "rust", "c++", "swift", "kotlin", "ruby", "rails", "django",
    "spring", "terraform", "ansible", "devops", "ci/cd", "git",
  ];
  return techKeywords.some((kw) => skill.toLowerCase().includes(kw));
}
