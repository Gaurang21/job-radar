import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET() {
  try {
    const items = await prisma.pipelineItem.findMany({
      include: { job: true },
      orderBy: { updatedAt: "desc" },
    });

    const serialized = items.map((item) => ({
      ...item,
      deadline: item.deadline?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      job: item.job
        ? {
            ...item.job,
            matchReasons: safeJsonParse(item.job.matchReasons, []),
            postedDate: item.job.postedDate?.toISOString() ?? null,
            closingDate: item.job.closingDate?.toISOString() ?? null,
            createdAt: item.job.createdAt.toISOString(),
            updatedAt: item.job.updatedAt.toISOString(),
          }
        : null,
    }));

    return NextResponse.json({ items: serialized });
  } catch {
    return NextResponse.json({ error: "Failed to load pipeline" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { jobId, stage } = await req.json();
    if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

    const job = await prisma.job.findUnique({ where: { id: jobId } });
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    const item = await prisma.pipelineItem.upsert({
      where: { jobId },
      create: { jobId, stage: stage || "saved" },
      update: { stage: stage || "saved" },
      include: { job: true },
    });

    // Also mark job as saved
    await prisma.job.update({
      where: { id: jobId },
      data: { saved: true },
    });

    return NextResponse.json({
      success: true,
      item: {
        ...item,
        deadline: item.deadline?.toISOString() ?? null,
        createdAt: item.createdAt.toISOString(),
        updatedAt: item.updatedAt.toISOString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to add to pipeline" }, { status: 500 });
  }
}
