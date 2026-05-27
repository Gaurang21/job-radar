import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveAIContext } from "@/lib/ai-context";
import { scoreJob } from "@/services/aiService";
import { rowToProfile } from "@/lib/utils";
import { generateExternalId } from "@/lib/utils";

export const runtime = "nodejs";

// Authenticate via Bearer token (Supabase JWT)
async function authenticateBearer(req: NextRequest): Promise<{ userId: string } | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const supabase = createAdminClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return { userId: user.id };
}

export async function POST(req: NextRequest) {
  try {
    const authResult = await authenticateBearer(req);
    if (!authResult) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { userId } = authResult;
    const supabase = createAdminClient();

    const body = await req.json();
    const {
      title, company, location, description,
      application_url, salary_min, salary_max,
      salary_currency, job_type, seniority,
      posted_date, hiring_manager, hiring_manager_url,
      company_size, company_industry, source = "manual",
    } = body;

    if (!title || !company || !application_url) {
      return NextResponse.json(
        { error: "title, company, and application_url are required" },
        { status: 400 }
      );
    }

    // Check for duplicate
    const externalId = generateExternalId(source, title, company, application_url);
    const { data: existing } = await supabase
      .from("jobs")
      .select("id, match_score")
      .eq("user_id", userId)
      .eq("external_id", externalId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({
        success: true,
        jobId: existing.id,
        duplicate: true,
        message: "Job already saved",
      });
    }

    // Resolve AI context for scoring
    const ctx = await resolveAIContext(supabase, userId);

    // Get user profile for scoring
    const { data: profileRow } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", userId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const profile = rowToProfile(profileRow);

    // Build job object
    const jobData: Record<string, unknown> = {
      user_id: userId,
      external_id: externalId,
      title,
      company,
      location: location ?? null,
      description: description ?? "",
      requirements: null,
      responsibilities: null,
      application_url,
      source,
      salary_min: salary_min ?? null,
      salary_max: salary_max ?? null,
      salary_currency: salary_currency ?? "USD",
      job_type: job_type ?? null,
      seniority: seniority ?? null,
      posted_date: posted_date ?? null,
      closing_date: null,
      hiring_manager: hiring_manager ?? null,
      hiring_manager_url: hiring_manager_url ?? null,
      company_size: company_size ?? null,
      company_industry: company_industry ?? null,
      company_rating: null,
      company_funding: null,
      match_score: 0,
      match_reasons: [],
      why_match: null,
      ai_summary: null,
      skill_gaps: null,
      duplicate_of: null,
      duplicate_sources: [],
      saved: false,
      scored: false,
      resume_version: profile?.version ?? null,
    };

    // Insert the job first
    const { data: insertedJob, error: insertError } = await supabase
      .from("jobs")
      .insert(jobData)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Score with AI if profile available
    if (profile) {
      try {
        const result = await scoreJob(ctx, insertedJob, profile);
        await supabase
          .from("jobs")
          .update({
            match_score: result.score,
            match_reasons: result.reasons,
            why_match: result.whyMatch,
            scored: true,
          })
          .eq("id", insertedJob.id);

        return NextResponse.json({
          success: true,
          jobId: insertedJob.id,
          matchScore: result.score,
          reasons: result.reasons,
        });
      } catch {
        // Return success even if scoring fails
        return NextResponse.json({
          success: true,
          jobId: insertedJob.id,
          matchScore: 0,
          reasons: [],
        });
      }
    }

    return NextResponse.json({
      success: true,
      jobId: insertedJob.id,
      matchScore: 0,
      reasons: [],
    });
  } catch (err) {
    console.error("Extension save-job error:", err);
    return NextResponse.json(
      { error: (err as Error).message || "Failed to save job" },
      { status: 500 }
    );
  }
}
