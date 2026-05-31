import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/supabase/server";
import { scoreATS } from "@/services/aiService";
import { resolveAIContext } from "@/lib/ai-context";
import { rowToProfile } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const { resumeText, jobDescription, useStoredResume } = await req.json();

    if (!jobDescription?.trim()) {
      return NextResponse.json({ error: "jobDescription is required" }, { status: 400 });
    }

    let finalResumeText = resumeText?.trim() ?? "";

    // If useStoredResume is true (or no resumeText provided), load from DB
    if (useStoredResume || !finalResumeText) {
      const { data: profileRow } = await supabase
        .from("resumes")
        .select("*")
        .eq("user_id", user.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      const profile = rowToProfile(profileRow);
      if (!profile) {
        return NextResponse.json(
          { error: "No stored resume found. Please upload your resume or paste it directly." },
          { status: 400 }
        );
      }
      finalResumeText = profile.rawText;
    }

    if (!finalResumeText) {
      return NextResponse.json({ error: "Resume text is required" }, { status: 400 });
    }

    const ctx = await resolveAIContext(supabase, user.id);
    const result = await scoreATS(ctx, finalResumeText, jobDescription);

    return NextResponse.json({ success: true, result });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
