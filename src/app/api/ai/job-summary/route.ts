import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/supabase/server";
import { summarizeJob } from "@/services/aiService";
import { resolveAIContext } from "@/lib/ai-context";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const { jobId } = await req.json();
    if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

    const { data: job } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", jobId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

    if (job.ai_summary) return NextResponse.json({ summary: job.ai_summary });

    const ctx = await resolveAIContext(supabase, user.id);
    const summary = await summarizeJob(ctx, job);

    await supabase.from("jobs").update({ ai_summary: summary }).eq("id", jobId);
    return NextResponse.json({ success: true, summary });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
