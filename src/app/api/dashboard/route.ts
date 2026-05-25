import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";
import type { Job } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const [
      totalJobs,
      scoredJobs,
      pipelineItems,
      notifications,
      topMatchJobs,
      lastFetchSetting,
      lastVisitSetting,
    ] = await Promise.all([
      prisma.job.count(),
      prisma.job.aggregate({ _avg: { matchScore: true } }),
      prisma.pipelineItem.groupBy({ by: ["stage"], _count: { stage: true } }),
      prisma.notification.count({ where: { read: false } }),
      prisma.job.findMany({
        where: { matchScore: { gt: 0 } },
        orderBy: { matchScore: "desc" },
        take: 3,
        include: { pipelineItem: true },
      }),
      prisma.setting.findUnique({ where: { key: "lastJobFetch" } }),
      prisma.setting.findUnique({ where: { key: "lastVisit" } }),
    ]);

    // Count new jobs since last visit
    const lastVisitDate = lastVisitSetting ? new Date(lastVisitSetting.value) : null;
    const newSinceLastVisit = lastVisitDate
      ? await prisma.job.count({ where: { createdAt: { gt: lastVisitDate } } })
      : 0;

    // Update last visit
    await prisma.setting.upsert({
      where: { key: "lastVisit" },
      create: { key: "lastVisit", value: new Date().toISOString() },
      update: { value: new Date().toISOString() },
    });

    const stageMap: Record<string, number> = {};
    for (const item of pipelineItems) {
      stageMap[item.stage] = item._count.stage;
    }

    // Check API status
    const apiStatus = {
      anthropic: process.env.ANTHROPIC_API_KEY ? "ok" : "unknown",
      adzuna: process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY ? "ok" : "unknown",
      apify: process.env.APIFY_API_TOKEN ? "ok" : "unknown",
      resend: process.env.RESEND_API_KEY ? "ok" : "unknown",
      messages: [] as Array<{ service: string; message: string; severity: string }>,
    };

    if (!process.env.ANTHROPIC_API_KEY) {
      apiStatus.messages.push({
        service: "Anthropic",
        message: "⚠️ AI features unavailable — your Anthropic API key is invalid or out of credits. Visit console.anthropic.com to top up.",
        severity: "warning",
      });
    }
    if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
      apiStatus.messages.push({
        service: "Adzuna",
        message: "⚠️ Adzuna job fetch not configured — add ADZUNA_APP_ID and ADZUNA_APP_KEY to your .env file.",
        severity: "warning",
      });
    }
    if (!process.env.APIFY_API_TOKEN) {
      apiStatus.messages.push({
        service: "Apify",
        message: "⚠️ LinkedIn/Indeed scraping not configured — add APIFY_API_TOKEN to your .env file.",
        severity: "warning",
      });
    }

    const serializedTopMatches: Job[] = topMatchJobs.map((job) => ({
      ...job,
      matchReasons: safeJsonParse(job.matchReasons, []),
      duplicateSources: safeJsonParse(job.duplicateSources, []),
      postedDate: job.postedDate?.toISOString() ?? null,
      closingDate: job.closingDate?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      source: job.source as Job["source"],
      pipelineItem: job.pipelineItem
        ? {
            ...job.pipelineItem,
            stage: job.pipelineItem.stage as import("@/types").PipelineStage,
            deadline: job.pipelineItem.deadline?.toISOString() ?? null,
            createdAt: job.pipelineItem.createdAt.toISOString(),
            updatedAt: job.pipelineItem.updatedAt.toISOString(),
          }
        : null,
    }));

    return NextResponse.json({
      totalJobs,
      avgMatchScore: Math.round(scoredJobs._avg.matchScore ?? 0),
      applied: stageMap["applied"] ?? 0,
      interviews: stageMap["interview"] ?? 0,
      offers: stageMap["offer"] ?? 0,
      newSinceLastVisit,
      topMatches: serializedTopMatches,
      apiStatus,
      lastFetch: lastFetchSetting?.value ?? null,
      unreadNotifications: notifications,
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
