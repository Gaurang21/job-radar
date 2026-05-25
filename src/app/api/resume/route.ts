import { NextRequest, NextResponse } from "next/server";
import { parseResume } from "@/lib/resume-parser";
import { prisma } from "@/lib/prisma";
import { safeJsonStringify } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("resume") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "text/plain",
    ];

    if (!allowedTypes.some((t) => file.type.includes(t.split("/")[1])) && !file.name.endsWith(".pdf") && !file.name.endsWith(".docx")) {
      return NextResponse.json(
        { error: "Only PDF, DOCX, and TXT files are supported" },
        { status: 400 }
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size must be under 10MB" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    // Determine MIME type
    let mimeType = file.type;
    if (!mimeType && file.name.endsWith(".pdf")) mimeType = "application/pdf";
    if (!mimeType && file.name.endsWith(".docx")) mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    // Parse the resume
    const parsed = await parseResume(buffer, mimeType);

    // Upsert the profile (only one profile at a time)
    const existingProfile = await prisma.profile.findFirst();

    const profile = await prisma.profile.upsert({
      where: { id: existingProfile?.id ?? "new" },
      create: {
        rawText: parsed.rawText,
        skills: safeJsonStringify(parsed.skills),
        titles: safeJsonStringify(parsed.titles),
        experienceYears: parsed.experienceYears,
        education: safeJsonStringify(parsed.education),
        location: parsed.location,
        desiredRole: parsed.desiredRole,
        summary: parsed.summary,
      },
      update: {
        rawText: parsed.rawText,
        skills: safeJsonStringify(parsed.skills),
        titles: safeJsonStringify(parsed.titles),
        experienceYears: parsed.experienceYears,
        education: safeJsonStringify(parsed.education),
        location: parsed.location,
        desiredRole: parsed.desiredRole,
        summary: parsed.summary,
      },
    });

    // If re-uploading, clear old jobs so they get re-scored
    if (existingProfile) {
      await prisma.pipelineItem.deleteMany();
      await prisma.job.deleteMany();
    }

    return NextResponse.json({
      success: true,
      profile: {
        ...profile,
        skills: parsed.skills,
        titles: parsed.titles,
        education: parsed.education,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to parse resume";
    console.error("Resume parse error:", err);

    if (message.includes("API") || message.includes("anthropic") || message.includes("credit")) {
      return NextResponse.json(
        {
          error: "AI parsing failed",
          details: "Your Anthropic API key is invalid or out of credits. Visit console.anthropic.com to check.",
          code: "ANTHROPIC_ERROR",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const profile = await prisma.profile.findFirst({
      orderBy: { updatedAt: "desc" },
    });

    if (!profile) {
      return NextResponse.json({ profile: null });
    }

    const { safeJsonParse } = await import("@/lib/utils");

    return NextResponse.json({
      profile: {
        ...profile,
        skills: safeJsonParse(profile.skills, []),
        titles: safeJsonParse(profile.titles, []),
        education: safeJsonParse(profile.education, []),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const existingProfile = await prisma.profile.findFirst();
    if (!existingProfile) {
      return NextResponse.json({ error: "No profile found" }, { status: 404 });
    }

    const { safeJsonStringify } = await import("@/lib/utils");

    const updated = await prisma.profile.update({
      where: { id: existingProfile.id },
      data: {
        skills: safeJsonStringify(body.skills ?? []),
        titles: safeJsonStringify(body.titles ?? []),
        experienceYears: body.experienceYears ?? existingProfile.experienceYears,
        education: safeJsonStringify(body.education ?? []),
        location: body.location ?? existingProfile.location,
        desiredRole: body.desiredRole ?? existingProfile.desiredRole,
        summary: body.summary ?? existingProfile.summary,
      },
    });

    return NextResponse.json({
      success: true,
      profile: {
        ...updated,
        skills: body.skills ?? [],
        titles: body.titles ?? [],
        education: body.education ?? [],
      },
    });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
