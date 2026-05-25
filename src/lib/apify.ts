import type { ApifyLinkedInJob, ApifyIndeedJob, ParsedProfile } from "@/types";
import { generateExternalId, normalizeJobType, normalizeSeniority } from "./utils";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE = "https://api.apify.com/v2";

// Apify Actor IDs for job scraping
const LINKEDIN_ACTOR_ID = "curious_coder/linkedin-jobs-search-scraper";
const INDEED_ACTOR_ID = "misceres/indeed-scraper";

export interface ApifyFetchResult {
  jobs: ProcessedApifyJob[];
  error?: string;
  source: "linkedin" | "indeed";
}

export interface ProcessedApifyJob {
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
  source: "linkedin" | "indeed";
  postedDate: string | null;
  hiringManager: string | null;
  companySize: string | null;
  companyIndustry: string | null;
}

// ─── Run Apify Actor ──────────────────────────────────────────

async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>
): Promise<unknown[]> {
  if (!APIFY_TOKEN) {
    throw new Error("Apify API token not configured");
  }

  // Start the actor run
  const runResp = await fetch(
    `${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/runs?token=${APIFY_TOKEN}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(10000),
    }
  );

  if (!runResp.ok) {
    if (runResp.status === 401 || runResp.status === 403) {
      throw new Error("Apify token is invalid or unauthorized");
    }
    const body = await runResp.text();
    if (body.includes("credit") || body.includes("quota")) {
      throw new Error("Apify credits exhausted");
    }
    throw new Error(`Apify actor start failed: ${runResp.status}`);
  }

  const runData = await runResp.json();
  const runId = runData.data?.id;
  if (!runId) throw new Error("No run ID returned from Apify");

  // Poll for completion (max 90s)
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await sleep(5000);
    const statusResp = await fetch(
      `${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`
    );
    const statusData = await statusResp.json();
    const status = statusData.data?.status;

    if (status === "SUCCEEDED") break;
    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new Error(`Apify actor run ${status}`);
    }
  }

  // Fetch results from dataset
  const datasetId = (await (await fetch(
    `${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`
  )).json()).data?.defaultDatasetId;

  if (!datasetId) throw new Error("No dataset ID from Apify run");

  const itemsResp = await fetch(
    `${APIFY_BASE}/datasets/${datasetId}/items?token=${APIFY_TOKEN}&format=json&limit=50`
  );
  const items = await itemsResp.json();
  return Array.isArray(items) ? items : [];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── LinkedIn Jobs ─────────────────────────────────────────────

export async function fetchLinkedInJobs(
  profile: ParsedProfile
): Promise<ApifyFetchResult> {
  if (!APIFY_TOKEN) {
    return { jobs: [], error: "Apify token not configured", source: "linkedin" };
  }

  try {
    const keywords = buildSearchKeywords(profile);
    const input = {
      keywords,
      location: profile.location || "United States",
      datePosted: "past week",
      limit: 25,
    };

    const rawJobs = await runApifyActor(LINKEDIN_ACTOR_ID, input) as ApifyLinkedInJob[];
    const jobs: ProcessedApifyJob[] = rawJobs.map((job) => ({
      externalId: generateExternalId("linkedin", job.title ?? "", job.companyName ?? "", job.url ?? ""),
      title: job.title ?? "Unknown Title",
      company: job.companyName ?? "Unknown Company",
      location: job.location ?? null,
      salaryMin: parseSalaryMin(job.salary),
      salaryMax: parseSalaryMax(job.salary),
      salaryCurrency: "USD",
      jobType: normalizeJobType(job.employmentType),
      seniority: normalizeSeniority(job.title ?? "", job.seniorityLevel),
      description: job.description ?? "",
      applicationUrl: job.url ?? "",
      source: "linkedin",
      postedDate: job.postedDate ?? null,
      hiringManager: null,
      companySize: job.companySize ?? null,
      companyIndustry: job.industry ?? null,
    }));

    return { jobs, source: "linkedin" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { jobs: [], error: message, source: "linkedin" };
  }
}

// ─── Indeed Jobs ──────────────────────────────────────────────

export async function fetchIndeedJobs(
  profile: ParsedProfile
): Promise<ApifyFetchResult> {
  if (!APIFY_TOKEN) {
    return { jobs: [], error: "Apify token not configured", source: "indeed" };
  }

  try {
    const keywords = buildSearchKeywords(profile);
    const input = {
      position: keywords,
      location: profile.location || "United States",
      maxItems: 25,
      parseCompanyDetails: false,
    };

    const rawJobs = await runApifyActor(INDEED_ACTOR_ID, input) as ApifyIndeedJob[];
    const jobs: ProcessedApifyJob[] = rawJobs.map((job) => ({
      externalId: generateExternalId("indeed", job.title ?? "", job.company ?? "", job.url ?? ""),
      title: job.title ?? "Unknown Title",
      company: job.company ?? "Unknown Company",
      location: job.location ?? null,
      salaryMin: parseSalaryMin(job.salary),
      salaryMax: parseSalaryMax(job.salary),
      salaryCurrency: "USD",
      jobType: normalizeJobType(job.jobType),
      seniority: normalizeSeniority(job.title ?? ""),
      description: job.description ?? "",
      applicationUrl: job.url ?? "",
      source: "indeed",
      postedDate: job.date ?? null,
      hiringManager: null,
      companySize: null,
      companyIndustry: null,
    }));

    return { jobs, source: "indeed" };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { jobs: [], error: message, source: "indeed" };
  }
}

// ─── Helpers ──────────────────────────────────────────────────

function buildSearchKeywords(profile: ParsedProfile): string {
  if (profile.desiredRole) return profile.desiredRole;
  if (profile.titles.length > 0) return profile.titles[0];
  return "Software Engineer";
}

function parseSalaryMin(salaryStr?: string): number | null {
  if (!salaryStr) return null;
  const match = salaryStr.replace(/,/g, "").match(/\$?([\d.]+)/);
  if (!match) return null;
  return parseFloat(match[1]);
}

function parseSalaryMax(salaryStr?: string): number | null {
  if (!salaryStr) return null;
  const clean = salaryStr.replace(/,/g, "");
  const matches = clean.match(/\$?([\d.]+)/g);
  if (!matches || matches.length < 2) return null;
  return parseFloat(matches[1].replace("$", ""));
}
