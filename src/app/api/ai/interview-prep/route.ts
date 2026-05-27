import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/supabase/server";
import { generateInterviewPrep } from "@/services/aiService";
import { resolveAIContext } from "@/lib/ai-context";
import { rowToProfile } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const { jobId } = await req.json();
    if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

    const [{ data: job }, { data: profileRow }, ctx] = await Promise.all([
      supabase.from("jobs").select("*").eq("id", jobId).eq("user_id", user.id).maybeSingle(),
      supabase.from("resumes").select("*").eq("user_id", user.id).order("version", { ascending: false }).limit(1).maybeSingle(),
      resolveAIContext(supabase, user.id),
    ]);

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    const profile = rowToProfile(profileRow);
    if (!profile) return NextResponse.json({ error: "No profile" }, { status: 400 });

    const result = await generateInterviewPrep(ctx, job, profile);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
