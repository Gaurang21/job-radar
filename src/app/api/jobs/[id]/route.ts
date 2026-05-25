import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const job = await prisma.job.findUnique({
      where: { id: params.id },
      include: { pipelineItem: true },
    });

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json({
      job: {
        ...job,
        matchReasons: safeJsonParse(job.matchReasons, []),
        duplicateSources: safeJsonParse(job.duplicateSources, []),
        postedDate: job.postedDate?.toISOString() ?? null,
        closingDate: job.closingDate?.toISOString() ?? null,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        pipelineItem: job.pipelineItem
          ? {
              ...job.pipelineItem,
              deadline: job.pipelineItem.deadline?.toISOString() ?? null,
              createdAt: job.pipelineItem.createdAt.toISOString(),
              updatedAt: job.pipelineItem.updatedAt.toISOString(),
            }
          : null,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load job" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const job = await prisma.job.update({
      where: { id: params.id },
      data: {
        saved: body.saved !== undefined ? body.saved : undefined,
      },
    });

    return NextResponse.json({ success: true, job });
  } catch {
    return NextResponse.json({ error: "Failed to update job" }, { status: 500 });
  }
}
