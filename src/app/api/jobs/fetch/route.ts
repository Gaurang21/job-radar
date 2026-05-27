import { NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/supabase/server";
import { fetchAdzunaJobs } from "@/services/adzunaService";
import { fetchLinkedInJobs, fetchIndeedJobs } from "@/services/apifyService";
import { batchScoreJobs } from "@/services/aiService";
import { resolveAIContext } from "@/lib/ai-context";
import { rowToProfile } from "@/lib/utils";
import type { ProcessedJob } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST() {
  try {
    const { supabase, user } = await requireUser();

    // Load user's profile
    const { data: profileRow } = await supabase
      .from("resumes")
      .select("*")
      .eq("user_id", user.id)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    const profile = rowToProfile(profileRow);
    if (!profile) {
      return NextResponse.json({ error: "Upload your resume first" }, { status: 400 });
    }

    const ctx = await resolveAIContext(supabase, user.id);
    const errors: Array<{ service: string; message: string }> = [];
    const allJobs: ProcessedJob[] = [];

    // ── Adzuna ──
    const adzunaResult = await fetchAdzunaJobs(profile, 50);
    if (adzunaResult.error) errors.push({ service: "adzuna", message: adzunaResult.error });
    allJobs.push(...adzunaResult.jobs);

    // ── Apify (parallel) ──
    const [linkedInResult, indeedResult] = await Promise.allSettled([
      fetchLinkedInJobs(profile),
      fetchIndeedJobs(profile),
    ]);

    if (linkedInResult.status === "fulfilled") {
      if (linkedInResult.value.error) errors.push({ service: "apify_linkedin", message: linkedInResult.value.error });
      allJobs.push(...linkedInResult.value.jobs);
    }
    if (indeedResult.status === "fulfilled") {
      if (indeedResult.value.error) errors.push({ service: "apify_indeed", message: indeedResult.value.error });
      allJobs.push(...indeedResult.value.jobs);
    }

    if (allJobs.length === 0) {
      return NextResponse.json({ success: false, error: "No jobs fetched", details: errors }, { status: 503 });
    }

    // ── Upsert jobs ──
    let newCount = 0;
    const insertedIds: string[] = [];

    for (const job of allJobs) {
      const { data: upserted, error } = await supabase
        .from("jobs")
        .upsert({
          user_id: user.id,
          external_id: job.external_id,
          title: job.title,
          company: job.company,
          location: job.location,
          salary_min: job.salary_min,
          salary_max: job.salary_max,
          salary_currency: job.salary_currency,
          job_type: job.job_type,
          seniority: job.seniority,
          description: job.description,
          application_url: job.application_url,
          source: job.source,
          posted_date: job.posted_date,
          hiring_manager: job.hiring_manager ?? null,
          company_size: job.company_size ?? null,
          company_industry: job.company_industry ?? null,
        }, { onConflict: "user_id,external_id" })
        .select("id, scored")
        .single();

      if (!error && upserted) {
        insertedIds.push(upserted.id);
        if (!upserted.scored) newCount++;
      }
    }

    // ── Score unscored jobs ──
    const { data: unscored } = await supabase
      .from("jobs")
      .select("id, title, company, description, requirements")
      .eq("user_id", user.id)
      .eq("scored", false)
      .limit(30);

    let scoredCount = 0;
    if (unscored && unscored.length > 0) {
      const scoreMap = await batchScoreJobs(ctx, unscored, profile);

      for (const [jobId, result] of Array.from(scoreMap.entries())) {
        await supabase
          .from("jobs")
          .update({
            match_score: result.score,
            match_reasons: result.reasons,
            why_match: result.whyMatch,
            scored: true,
            resume_version: profile.version ?? 1,
          })
          .eq("id", jobId);
        scoredCount++;
      }
    }

    // ── Save last fetch + visit timestamps ──
    await supabase.from("settings").upsert(
      { user_id: user.id, key: "lastJobFetch", value: new Date().toISOString(), updated_at: new Date().toISOString() },
      { onConflict: "user_id,key" }
    );

    // ── Create notifications for high-match new jobs ──
    const { data: highMatch } = await supabase
      .from("jobs")
      .select("id, title, company, match_score")
      .eq("user_id", user.id)
      .gte("match_score", 75)
      .gt("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .limit(5);

    if (highMatch) {
      for (const j of highMatch) {
        await supabase.from("notifications").upsert({
          user_id: user.id,
          type: "high_score",
          title: "Strong Match Found!",
          message: `${j.title} at ${j.company} — ${j.match_score}% match`,
          job_id: j.id,
        });
      }
    }

    return NextResponse.json({
      success: true,
      jobsFound: allJobs.length,
      newJobs: newCount,
      scored: scoredCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    console.error(err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
