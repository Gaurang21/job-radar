import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateExternalId, normalizeJobType, normalizeSeniority } from "@/lib/utils";

export const runtime = "nodejs";

// CORS headers for browser extension
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, company, description, url, location, salary, jobType } = body;

    if (!title || !company || !url) {
      return NextResponse.json(
        { error: "title, company, and url are required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const externalId = generateExternalId("manual", title, company, url);

    const job = await prisma.job.upsert({
      where: { externalId },
      create: {
        externalId,
        title,
        company,
        description: description || "Saved from browser extension",
        applicationUrl: url,
        location: location || null,
        jobType: normalizeJobType(jobType) || "full-time",
        seniority: normalizeSeniority(title),
        source: "manual",
        scored: false,
      },
      update: { description: description || "Saved from browser extension" },
    });

    // Auto-add to pipeline as "saved"
    await prisma.pipelineItem.upsert({
      where: { jobId: job.id },
      create: { jobId: job.id, stage: "saved" },
      update: {},
    });

    await prisma.job.update({ where: { id: job.id }, data: { saved: true } });

    return NextResponse.json(
      { success: true, jobId: job.id, message: "Saved to JobRadar!" },
      { headers: corsHeaders }
    );
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500, headers: corsHeaders }
    );
  }
}
