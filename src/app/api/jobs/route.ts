import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeJsonParse } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || undefined;
    const jobType = searchParams.get("jobType") || undefined;
    const location = searchParams.get("location") || undefined;
    const seniority = searchParams.get("seniority") || undefined;
    const source = searchParams.get("source") || undefined;
    const sortBy = searchParams.get("sortBy") || "score";
    const minScore = searchParams.get("minScore") ? Number(searchParams.get("minScore")) : undefined;
    const saved = searchParams.get("saved") === "true" ? true : undefined;
    const page = Number(searchParams.get("page") || "1");
    const pageSize = Number(searchParams.get("pageSize") || "20");

    // Build where clause
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { company: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (jobType) where.jobType = jobType;
    if (location) where.location = { contains: location };
    if (seniority) where.seniority = seniority;
    if (source) where.source = source;
    if (minScore !== undefined) where.matchScore = { gte: minScore };
    if (saved !== undefined) where.saved = saved;

    // Build order clause
    let orderBy: Record<string, string> | Array<Record<string, string>> = { createdAt: "desc" };
    if (sortBy === "score") orderBy = [{ matchScore: "desc" }, { createdAt: "desc" }];
    if (sortBy === "newest") orderBy = { postedDate: "desc" };
    if (sortBy === "salary") orderBy = [{ salaryMax: "desc" }, { salaryMin: "desc" }];

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { pipelineItem: true },
      }),
      prisma.job.count({ where }),
    ]);

    const serialized = jobs.map((job) => ({
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
    }));

    return NextResponse.json({
      jobs: serialized,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err) {
    console.error("Jobs GET error:", err);
    return NextResponse.json({ error: "Failed to load jobs" }, { status: 500 });
  }
}
