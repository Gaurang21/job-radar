import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmailDigest } from "@/lib/email";
import { safeJsonParse } from "@/lib/utils";
import type { Job } from "@/types";

export const runtime = "nodejs";

export async function POST() {
  try {
    const recipientEmail = process.env.DIGEST_EMAIL_TO;
    if (!recipientEmail) {
      return NextResponse.json(
        { error: "DIGEST_EMAIL_TO not configured in .env" },
        { status: 400 }
      );
    }

    const jobs = await prisma.job.findMany({
      where: { matchScore: { gt: 0 } },
      orderBy: { matchScore: "desc" },
      take: 20,
    });

    const serializedJobs: Job[] = jobs.map((job) => ({
      ...job,
      matchReasons: safeJsonParse(job.matchReasons, []),
      duplicateSources: safeJsonParse(job.duplicateSources, []),
      postedDate: job.postedDate?.toISOString() ?? null,
      closingDate: job.closingDate?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),
      source: job.source as Job["source"],
    }));

    const result = await sendEmailDigest(serializedJobs, recipientEmail);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error, code: "RESEND_ERROR" },
        { status: 503 }
      );
    }

    return NextResponse.json({ success: true, sentTo: recipientEmail });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
