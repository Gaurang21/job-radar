import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/supabase/server";
import { parseResume } from "@/services/resumeParser";
import { resolveAIContext } from "@/lib/ai-context";
import { rowToProfile } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();

    const formData = await req.formData();
    const file = formData.get("resume") as File | null;
    if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File must be under 10MB" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let mimeType = file.type;
    if (!mimeType && file.name.endsWith(".pdf")) mimeType = "application/pdf";
    if (!mimeType && file.name.endsWith(".docx")) mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

    // Resolve AI context (per-user key or env)
    const ctx = await resolveAIContext(supabase, user.id);

    // Parse via Claude
    const parsed = await parseResume(buffer, mimeType, { apiKey: ctx.apiKey });

    // Upload file to Supabase Storage
    const filePath = `${user.id}/resume-${Date.now()}.${file.name.split(".").pop()}`;
    const { error: uploadError } = await supabase.storage
      .from("resumes")
      .upload(filePath, buffer, { contentType: mimeType, upsert: true });
    if (uploadError) console.error("Storage upload error:", uploadError);

    // Get existing resume (for version bump)
    const { data: existing } = await supabase
      .from("resumes")
      .select("id, version")
      .eq("user_id", user.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const newVersion = (existing?.version ?? 0) + 1;

    // Delete existing resumes (keep only latest)
    if (existing) {
      await supabase.from("resumes").delete().eq("user_id", user.id);
    }

    const { data: profile, error: insertError } = await supabase
      .from("resumes")
      .insert({
        user_id: user.id,
        version: newVersion,
        raw_text: parsed.rawText,
        skills: parsed.skills,
        titles: parsed.titles,
        experience_years: parsed.experienceYears,
        education: parsed.education,
        location: parsed.location ?? null,
        desired_role: parsed.desiredRole ?? null,
        summary: parsed.summary ?? null,
        file_path: filePath,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // If re-uploading, clear old jobs so they get re-scored
    if (existing) {
      await supabase.from("jobs").delete().eq("user_id", user.id);
    }

    return NextResponse.json({ success: true, profile: rowToProfile(profile) });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    const message = err instanceof Error ? err.message : "Failed to parse resume";
    console.error("Resume parse error:", err);
    if (message.includes("API") || message.includes("anthropic") || message.includes("credit") || message.includes("401")) {
      return NextResponse.json({
        error: "AI parsing failed",
        details: "Your Anthropic API key is invalid or out of credits.",
        code: "ANTHROPIC_ERROR",
      }, { status: 503 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    const { data: profile } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", user.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    return NextResponse.json({ profile: rowToProfile(profile) });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const body = await req.json();

    const { data: existing } = await supabase
      .from("resumes")
      .select("id, version")
      .eq("user_id", user.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!existing) return NextResponse.json({ error: "No profile found" }, { status: 404 });

    const { data: updated, error } = await supabase
      .from("resumes")
      .update({
        skills: body.skills ?? [],
        titles: body.titles ?? [],
        experience_years: body.experienceYears ?? 0,
        education: body.education ?? [],
        location: body.location ?? null,
        desired_role: body.desiredRole ?? null,
        summary: body.summary ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true, profile: rowToProfile(updated) });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Failed to update" }, { status: 500 });
  }
}
