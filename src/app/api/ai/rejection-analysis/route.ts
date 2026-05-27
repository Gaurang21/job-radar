import { NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/supabase/server";
import { analyzeRejections } from "@/services/aiService";
import { resolveAIContext } from "@/lib/ai-context";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { supabase, user } = await requireUser();

    const { data: rejectedItems } = await supabase
      .from("pipeline_items")
      .select("job:jobs(title, company, description, seniority)")
      .eq("user_id", user.id)
      .eq("stage", "rejected");

    const rejected = (rejectedItems ?? [])
      .map((r) => (Array.isArray(r.job) ? r.job[0] : r.job) as { title: string; company: string; description?: string; seniority?: string | null } | null)
      .filter((j): j is NonNullable<typeof j> => j !== null && j !== undefined);

    const ctx = await resolveAIContext(supabase, user.id);
    const analysis = await analyzeRejections(ctx, rejected);
    return NextResponse.json({ analysis });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
