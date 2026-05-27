import { NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/supabase/server";
import { summarizeMarket } from "@/services/aiService";
import { resolveAIContext } from "@/lib/ai-context";
import { rowToProfile } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST() {
  return GET();
}

export async function GET() {
  try {
    const { supabase, user } = await requireUser();

    // Check cache (24 hours)
    const { data: cached } = await supabase
      .from("market_trends")
      .select("*")
      .eq("user_id", user.id)
      .gt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached) return NextResponse.json({ pulse: cached.summary });

    const { data: profileRow } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", user.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const profile = rowToProfile(profileRow);
    if (!profile) return NextResponse.json({ error: "No profile" }, { status: 400 });

    const { data: recentJobs } = await supabase
      .from("jobs")
      .select("title, company, salary_min, salary_max, description")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    const ctx = await resolveAIContext(supabase, user.id);
    const targetRole = profile.desiredRole ?? profile.titles[0] ?? "Software Engineer";
    const location = profile.location ?? "Remote";

    const pulse = await summarizeMarket(ctx, targetRole, location, recentJobs ?? []);

    await supabase.from("market_trends").insert({
      user_id: user.id,
      target_role: targetRole,
      location,
      summary: pulse,
    });

    return NextResponse.json({ pulse });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
