import type { ApifyLinkedInJob, ApifyIndeedJob, ParsedProfile, ProcessedJob } from "@/types";
import { generateExternalId, normalizeJobType, normalizeSeniority } from "@/lib/utils";

const APIFY_TOKEN = process.env.APIFY_API_TOKEN;
const APIFY_BASE = "https://api.apify.com/v2";

const LINKEDIN_ACTOR_ID = "curious_coder/linkedin-jobs-search-scraper";
const INDEED_ACTOR_ID = "misceres/indeed-scraper";

export interface ApifyFetchResult {
  jobs: ProcessedJob[];
  error?: string;
  source: "linkedin" | "indeed";
}

async function runApifyActor(actorId: string, input: Record<string, unknown>): Promise<unknown[]> {
  if (!APIFY_TOKEN) throw new Error("Apify API token not configured");

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
    if (runResp.status === 401 || runResp.status === 403) throw new Error("Apify token invalid");
    const body = await runResp.text();
    if (body.includes("credit") || body.includes("quota")) throw new Error("Apify credits exhausted");
    throw new Error(`Apify actor start failed: ${runResp.status}`);
  }

  const runData = await runResp.json();
  const runId = runData.data?.id;
  if (!runId) throw new Error("No run ID returned");

  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 5000));
    const statusResp = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`);
    const statusData = await statusResp.json();
    const status = statusData.data?.status;
    if (status === "SUCCEEDED") break;
    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      throw new Error(`Apify run ${status}`);
    }
  }

  const finalRun = await (await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`)).json();
  const datasetId = finalRun.data?.defaultDatasetId;
  if (!datasetId) throw new Error("No dataset ID");

  const items = await (await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?token=${APIFY_TOKEN}&format=json&limit=50`)).json();
  return Array.isArray(items) ? items : [];
}

export async function fetchLinkedInJobs(profile: ParsedProfile): Promise<ApifyFetchResult> {
  if (!APIFY_TOKEN) return { jobs: [], error: "Apify token not configured", source: "linkedin" };

  try {
    const keywords = buildSearchKeywords(profile);
    const rawJobs = (await runApifyActor(LINKEDIN_ACTOR_ID, {
      keywords,
      location: profile.location || "United States",
      datePosted: "past week",
      limit: 25,
    })) as ApifyLinkedInJob[];

    const jobs: ProcessedJob[] = rawJobs.map((job) => ({
      external_id: generateExternalId("linkedin", job.title ?? "", job.companyName ?? "", job.url ?? ""),
      title: job.title ?? "Unknown",
      company: job.companyName ?? "Unknown",
      location: job.location ?? null,
      salary_min: parseSalaryMin(job.salary),
      salary_max: parseSalaryMax(job.salary),
      salary_currency: "USD",
      job_type: normalizeJobType(job.employmentType),
      seniority: normalizeSeniority(job.title ?? "", job.seniorityLevel),
      description: job.description ?? "",
      application_url: job.url ?? "",
      source: "linkedin",
      posted_date: job.postedDate ?? null,
      hiring_manager: null,
      company_size: job.companySize ?? null,
      company_industry: job.industry ?? null,
    }));

    return { jobs, source: "linkedin" };
  } catch (err) {
    return { jobs: [], error: err instanceof Error ? err.message : "Unknown", source: "linkedin" };
  }
}

export async function fetchIndeedJobs(profile: ParsedProfile): Promise<ApifyFetchResult> {
  if (!APIFY_TOKEN) return { jobs: [], error: "Apify token not configured", source: "indeed" };

  try {
    const keywords = buildSearchKeywords(profile);
    const rawJobs = (await runApifyActor(INDEED_ACTOR_ID, {
      position: keywords,
      location: profile.location || "United States",
      maxItems: 25,
      parseCompanyDetails: false,
    })) as ApifyIndeedJob[];

    const jobs: ProcessedJob[] = rawJobs.map((job) => ({
      external_id: generateExternalId("indeed", job.title ?? "", job.company ?? "", job.url ?? ""),
      title: job.title ?? "Unknown",
      company: job.company ?? "Unknown",
      location: job.location ?? null,
      salary_min: parseSalaryMin(job.salary),
      salary_max: parseSalaryMax(job.salary),
      salary_currency: "USD",
      job_type: normalizeJobType(job.jobType),
      seniority: normalizeSeniority(job.title ?? ""),
      description: job.description ?? "",
      application_url: job.url ?? "",
      source: "indeed",
      posted_date: job.date ?? null,
    }));

    return { jobs, source: "indeed" };
  } catch (err) {
    return { jobs: [], error: err instanceof Error ? err.message : "Unknown", source: "indeed" };
  }
}

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
