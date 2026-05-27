import { NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/supabase/server";
import { sendEmailDigest } from "@/services/emailService";

export const runtime = "nodejs";

export async function POST() {
  try {
    const { supabase, user } = await requireUser();

    // Check user's digest preference
    const { data: profile } = await supabase
      .from("profiles")
      .select("digest_opt_in, email")
      .eq("id", user.id)
      .maybeSingle();
    const recipient = profile?.email ?? user.email;
    if (!recipient) return NextResponse.json({ error: "No recipient email" }, { status: 400 });
    if (profile?.digest_opt_in === false) {
      return NextResponse.json({ error: "Digest opt-out enabled in settings" }, { status: 400 });
    }

    const { data: jobs } = await supabase
      .from("jobs")
      .select("*")
      .eq("user_id", user.id)
      .gt("match_score", 0)
      .order("match_score", { ascending: false })
      .limit(20);

    const result = await sendEmailDigest(jobs ?? [], recipient);
    if (!result.success) {
      return NextResponse.json({ error: result.error, code: "RESEND_ERROR" }, { status: 503 });
    }
    return NextResponse.json({ success: true, sentTo: recipient });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
