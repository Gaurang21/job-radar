import { NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { supabase, user } = await requireUser();

    const [
      { count: totalJobs },
      avgResult,
      { data: pipelineStages },
      { count: unreadNotifications },
      { data: topMatches },
      { data: lastFetchSetting },
      { data: lastVisitSetting },
      { data: resumeRow },
    ] = await Promise.all([
      supabase.from("jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      supabase.from("jobs").select("match_score").eq("user_id", user.id).gt("match_score", 0),
      supabase.from("pipeline_items").select("stage").eq("user_id", user.id),
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("read", false),
      supabase.from("jobs").select("*").eq("user_id", user.id).gt("match_score", 0).order("match_score", { ascending: false }).limit(3),
      supabase.from("settings").select("value").eq("user_id", user.id).eq("key", "lastJobFetch").maybeSingle(),
      supabase.from("settings").select("value").eq("user_id", user.id).eq("key", "lastVisit").maybeSingle(),
      supabase.from("resumes").select("id").eq("user_id", user.id).limit(1).maybeSingle(),
    ]);

    // Calc avg score
    const scoreRows = avgResult.data ?? [];
    const avgMatchScore = scoreRows.length > 0
      ? Math.round(scoreRows.reduce((sum, j) => sum + (j.match_score ?? 0), 0) / scoreRows.length)
      : 0;

    // Stage counts
    const stageMap: Record<string, number> = {};
    for (const item of pipelineStages ?? []) {
      stageMap[item.stage] = (stageMap[item.stage] ?? 0) + 1;
    }

    // New since last visit
    const lastVisitDate = lastVisitSetting?.value ? new Date(lastVisitSetting.value) : null;
    let newSinceLastVisit = 0;
    if (lastVisitDate) {
      const { count } = await supabase
        .from("jobs")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gt("created_at", lastVisitDate.toISOString());
      newSinceLastVisit = count ?? 0;
    }

    // Update last visit
    await supabase.from("settings").upsert(
      { user_id: user.id, key: "lastVisit", value: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: "user_id,key" }
    );

    // Check API status — these are env-level checks
    const messages: Array<{ service: string; message: string; severity: string }> = [];

    const hasEnvAiKey = !!(process.env.ANTHROPIC_API_KEY || process.env.GROQ_API_KEY);
    if (!hasEnvAiKey) {
      const { data: aiSettings } = await supabase
        .from("ai_settings")
        .select("anthropic_api_key_encrypted, groq_api_key_encrypted")
        .eq("user_id", user.id)
        .maybeSingle();
      const hasUserKey = !!(aiSettings?.anthropic_api_key_encrypted || aiSettings?.groq_api_key_encrypted);
      if (!hasUserKey) {
        messages.push({
          service: "AI",
          message: "⚠️ AI features unavailable — add an Anthropic or Groq API key in Settings → AI.",
          severity: "warning",
        });
      }
    }

    if (!process.env.ADZUNA_APP_ID || !process.env.ADZUNA_APP_KEY) {
      messages.push({
        service: "Adzuna",
        message: "⚠️ Adzuna not configured — add ADZUNA_APP_ID and ADZUNA_APP_KEY to .env.",
        severity: "warning",
      });
    }

    const totalApplied = (stageMap["applied"] ?? 0) + (stageMap["phone_screen"] ?? 0) + (stageMap["interview"] ?? 0) + (stageMap["offer"] ?? 0) + (stageMap["rejected"] ?? 0);
    const offerRate = totalApplied > 0 ? Math.round(((stageMap["offer"] ?? 0) / totalApplied) * 100) : 0;

    return NextResponse.json({
      totalJobs: totalJobs ?? 0,
      avgMatchScore,
      applied: stageMap["applied"] ?? 0,
      interviews: stageMap["interview"] ?? 0,
      offers: stageMap["offer"] ?? 0,
      rejected: stageMap["rejected"] ?? 0,
      offerRate,
      newSinceLastVisit,
      topMatches: topMatches ?? [],
      lastFetch: lastFetchSetting?.value ?? null,
      unreadNotifications: unreadNotifications ?? 0,
      hasProfile: !!resumeRow,
      apiStatus: { messages },
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    console.error("Dashboard error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
