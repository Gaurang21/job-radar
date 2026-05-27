import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search");
    const jobType = searchParams.get("jobType");
    const location = searchParams.get("location");
    const seniority = searchParams.get("seniority");
    const source = searchParams.get("source");
    const sortBy = searchParams.get("sortBy") || "score";
    const minScore = searchParams.get("minScore") ? Number(searchParams.get("minScore")) : null;
    const saved = searchParams.get("saved") === "true";
    const page = Number(searchParams.get("page") || "1");
    const pageSize = Number(searchParams.get("pageSize") || "20");

    let query = supabase
      .from("jobs")
      .select("*, pipeline_item:pipeline_items(*)", { count: "exact" })
      .eq("user_id", user.id);

    if (search) {
      query = query.or(`title.ilike.%${search}%,company.ilike.%${search}%,description.ilike.%${search}%`);
    }
    if (jobType) query = query.eq("job_type", jobType);
    if (location) query = query.ilike("location", `%${location}%`);
    if (seniority) query = query.eq("seniority", seniority);
    if (source) query = query.eq("source", source);
    if (minScore !== null) query = query.gte("match_score", minScore);
    if (saved) query = query.eq("saved", true);

    if (sortBy === "score") query = query.order("match_score", { ascending: false }).order("created_at", { ascending: false });
    else if (sortBy === "newest") query = query.order("posted_date", { ascending: false, nullsFirst: false });
    else if (sortBy === "salary") query = query.order("salary_max", { ascending: false, nullsFirst: false });
    else query = query.order("created_at", { ascending: false });

    query = query.range((page - 1) * pageSize, page * pageSize - 1);

    const { data: jobs, count, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Flatten pipeline_item (Supabase returns it as array from FK)
    const normalized = (jobs ?? []).map((j) => ({
      ...j,
      pipeline_item: Array.isArray(j.pipeline_item) ? (j.pipeline_item[0] ?? null) : j.pipeline_item,
    }));

    return NextResponse.json({
      jobs: normalized,
      total: count ?? 0,
      page,
      pageSize,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Failed to load jobs" }, { status: 500 });
  }
}
