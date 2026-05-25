import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateCoverLetter } from "@/lib/job-matcher";
import { safeJsonParse } from "@/lib/utils";
import type { ParsedProfile } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        {
          error: "AI features unavailable",
          code: "ANTHROPIC_ERROR",
          message: "Your Anthropic API key is invalid or out of credits.",
        },
        { status: 503 }
      );
    }

    const { jobId } = await req.json();
    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
    }

    const [job, profileRecord] = await Promise.all([
      prisma.job.findUnique({ where: { id: jobId } }),
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
      summary: profileRecord.summary ?? undefined,
    };

    const coverLetter = await generateCoverLetter(
      {
        title: job.title,
        company: job.company,
        description: job.description,
      },
      profile
    );

    return NextResponse.json({ success: true, coverLetter });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed";
    if (message.includes("credit") || message.includes("auth") || message.includes("401")) {
      return NextResponse.json(
        { error: "AI features unavailable", code: "ANTHROPIC_ERROR", message },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
