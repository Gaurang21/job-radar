import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/supabase/server";
import { analyzeLinkedIn } from "@/services/aiService";
import { resolveAIContext } from "@/lib/ai-context";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const { about, experience } = await req.json();
    if (!about && !experience) return NextResponse.json({ error: "Provide about or experience text" }, { status: 400 });

    const ctx = await resolveAIContext(supabase, user.id);
    const analysis = await analyzeLinkedIn(ctx, about ?? "", experience ?? "");
    return NextResponse.json({ success: true, analysis });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
