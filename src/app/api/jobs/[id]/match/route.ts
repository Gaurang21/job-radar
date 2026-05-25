import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { scoreJob } from "@/lib/job-matcher";
import { safeJsonParse, safeJsonStringify } from "@/lib/utils";
import type { ParsedProfile } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: "AI scoring unavailable",
          code: "ANTHROPIC_ERROR",
          message: "Your Anthropic API key is not configured.",
        },
        { status: 503 }
      );
    }

    const [job, profileRecord] = await Promise.all([
      prisma.job.findUnique({ where: { id: params.id } }),
      prisma.profile.findFirst(),
    ]);

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (!profileRecord) return NextResponse.json({ error: "No profile found" }, { status: 400 });

    const profile: ParsedProfile = {
      rawText: profileRecord.rawText,
      skills: safeJsonParse(profileRecord.skills, []),
      titles: safeJsonParse(profileRecord.titles, []),
      experienceYears: profileRecord.experienceYears,
      education: safeJsonParse(profileRecord.education, []),
      location: profileRecord.location ?? undefined,
      desiredRole: profileRecord.desiredRole ?? undefined,
    };

    const result = await scoreJob(
      {
        title: job.title,
        company: job.company,
        description: job.description,
        requirements: job.requirements,
      },
      profile
    );

    const updated = await prisma.job.update({
      where: { id: params.id },
      data: {
        matchScore: result.score,
        matchReasons: safeJsonStringify(result.reasons),
        whyMatch: result.whyMatch,
        scored: true,
      },
    });

    return NextResponse.json({
      success: true,
      matchScore: result.score,
      matchReasons: result.reasons,
      whyMatch: result.whyMatch,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scoring failed";
    if (message.includes("credit") || message.includes("auth") || message.includes("401")) {
      return NextResponse.json(
        { error: "AI scoring failed", code: "ANTHROPIC_ERROR", message },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
