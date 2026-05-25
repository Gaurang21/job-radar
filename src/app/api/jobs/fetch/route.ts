import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchAdzunaJobs } from "@/lib/adzuna";
import { fetchLinkedInJobs, fetchIndeedJobs } from "@/lib/apify";
import { batchScoreJobs } from "@/lib/job-matcher";
import { safeJsonParse, safeJsonStringify } from "@/lib/utils";
import type { ParsedProfile } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST() {
  try {
    // Load the user's profile
    const profileRecord = await prisma.profile.findFirst();
    if (!profileRecord) {
      return NextResponse.json(
        { error: "No resume profile found. Please upload your resume first." },
        { status: 400 }
      );
    }

    const profile: ParsedProfile = {
      rawText: profileRecord.rawText,
      skills: safeJsonParse(profileRecord.skills, []),
      titles: safeJsonParse(profileRecord.titles, []),
      experienceYears: profileRecord.experienceYears,
      education: safeJsonParse(profileRecord.education, []),
      location: profileRecord.location ?? undefined,
      desiredRole: profileRecord.desiredRole ?? undefined,
      summary: profileRecord.summary ?? undefined,
    };

    const errors: Array<{ service: string; message: string }> = [];
    const allProcessedJobs: Array<{
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
      source: string;
      postedDate: string | null;
      hiringManager?: string | null;
      companySize?: string | null;
      companyIndustry?: string | null;
    }> = [];

    // ── Adzuna ──────────────────────────────────────────────────
    const adzunaResult = await fetchAdzunaJobs(profile, 50);
    if (adzunaResult.error) {
      errors.push({ service: "adzuna", message: adzunaResult.error });
    }
    allProcessedJobs.push(...adzunaResult.jobs);

    // ── Apify (LinkedIn + Indeed) ────────────────────────────────
    const [linkedInResult, indeedResult] = await Promise.allSettled([
      fetchLinkedInJobs(profile),
      fetchIndeedJobs(profile),
    ]);

    if (linkedInResult.status === "fulfilled") {
      if (linkedInResult.value.error) {
        errors.push({ service: "apify_linkedin", message: linkedInResult.value.error });
      }
      allProcessedJobs.push(...linkedInResult.value.jobs);
    } else {
      errors.push({ service: "apify_linkedin", message: linkedInResult.reason?.message ?? "Failed" });
    }

    if (indeedResult.status === "fulfilled") {
      if (indeedResult.value.error) {
        errors.push({ service: "apify_indeed", message: indeedResult.value.error });
      }
      allProcessedJobs.push(...indeedResult.value.jobs);
    } else {
      errors.push({ service: "apify_indeed", message: indeedResult.reason?.message ?? "Failed" });
    }

    if (allProcessedJobs.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No jobs fetched from any source",
          details: errors,
        },
        { status: 503 }
      );
    }

    // ── Dedup & upsert into DB ────────────────────────────────────
    let newCount = 0;
    const upsertedIds: string[] = [];

    for (const job of allProcessedJobs) {
      try {
        const upserted = await prisma.job.upsert({
          where: { externalId: job.externalId },
          create: {
            externalId: job.externalId,
            title: job.title,
            company: job.company,
            location: job.location,
            salaryMin: job.salaryMin,
            salaryMax: job.salaryMax,
            salaryCurrency: job.salaryCurrency,
            jobType: job.jobType,
            seniority: job.seniority,
            description: job.description,
            applicationUrl: job.applicationUrl,
            source: job.source,
            postedDate: job.postedDate ? new Date(job.postedDate) : null,
            hiringManager: "hiringManager" in job ? job.hiringManager ?? null : null,
            companySize: "companySize" in job ? job.companySize ?? null : null,
            companyIndustry: "companyIndustry" in job ? job.companyIndustry ?? null : null,
            scored: false,
          },
          update: {
            title: job.title,
            description: job.description,
          },
        });
        upsertedIds.push(upserted.id);
        if (upserted.scored === false) newCount++;
      } catch (e) {
        // Skip duplicate constraint errors
        console.error("Job upsert error:", e);
      }
    }

    // ── Score unscored jobs with Claude ──────────────────────────
    const unscoredJobs = await prisma.job.findMany({
      where: { scored: false },
      select: { id: true, title: true, company: true, description: true, requirements: true },
      take: 30, // Score up to 30 at once
    });

    if (unscoredJobs.length > 0 && process.env.ANTHROPIC_API_KEY) {
      const scoreMap = await batchScoreJobs(unscoredJobs, profile);

      for (const [jobId, matchResult] of Array.from(scoreMap.entries())) {
        await prisma.job.update({
          where: { id: jobId },
          data: {
            matchScore: matchResult.score,
            matchReasons: safeJsonStringify(matchResult.reasons),
            whyMatch: matchResult.whyMatch,
            scored: true,
          },
        });
      }
    }

    // ── Save last fetch time ──────────────────────────────────────
    await prisma.setting.upsert({
      where: { key: "lastJobFetch" },
      create: { key: "lastJobFetch", value: new Date().toISOString() },
      update: { value: new Date().toISOString() },
    });

    // ── Create notifications for high-match jobs ──────────────────
    const highMatchJobs = await prisma.job.findMany({
      where: { matchScore: { gte: 75 }, createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
      take: 5,
    });

    for (const job of highMatchJobs) {
      await prisma.notification.upsert({
        where: { id: `notif_${job.id}` },
        create: {
          id: `notif_${job.id}`,
          type: "high_score",
          title: "Strong Match Found!",
          message: `${job.title} at ${job.company} — ${job.matchScore}% match`,
          jobId: job.id,
        },
        update: {},
      });
    }

    return NextResponse.json({
      success: true,
      jobsFound: allProcessedJobs.length,
      newJobs: newCount,
      scored: unscoredJobs.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    console.error("Job fetch error:", err);
    return NextResponse.json(
      { error: "Failed to fetch jobs", details: (err as Error).message },
      { status: 500 }
    );
  }
}
