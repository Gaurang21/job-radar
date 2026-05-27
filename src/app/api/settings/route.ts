import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/supabase/server";
import { encrypt, decrypt, maskKey } from "@/lib/crypto";

export const runtime = "nodejs";

export async function GET() {
  try {
    const { supabase, user } = await requireUser();
    const [{ data: aiSettings }, { data: profile }] = await Promise.all([
      supabase.from("ai_settings").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    ]);

    // Mask the key for display
    const apiKey = aiSettings?.anthropic_api_key_encrypted ? decrypt(aiSettings.anthropic_api_key_encrypted) : null;

    return NextResponse.json({
      aiSettings: aiSettings ? { ...aiSettings, anthropic_api_key_encrypted: undefined, hasApiKey: !!apiKey, apiKeyMask: maskKey(apiKey) } : null,
      profile,
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const body = await req.json();
    const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };

    // Handle API key separately (encrypt)
    if (body.anthropic_api_key !== undefined) {
      if (body.anthropic_api_key === "" || body.anthropic_api_key === null) {
        updates.anthropic_api_key_encrypted = null;
      } else {
        updates.anthropic_api_key_encrypted = encrypt(body.anthropic_api_key);
      }
    }

    // Feature toggles
    const toggleKeys = [
      "match_scoring_enabled", "why_match_enabled", "job_summary_enabled",
      "skill_gap_enabled", "cover_letter_enabled", "interview_prep_enabled",
      "email_draft_enabled", "linkedin_analyzer_enabled", "market_pulse_enabled",
      "rejection_analyzer_enabled", "cover_letter_tone",
    ];
    for (const key of toggleKeys) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    // Profile updates (digest opt-in, name, etc.)
    if (body.full_name !== undefined || body.digest_opt_in !== undefined) {
      const profileUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (body.full_name !== undefined) profileUpdates.full_name = body.full_name;
      if (body.digest_opt_in !== undefined) profileUpdates.digest_opt_in = body.digest_opt_in;
      await supabase.from("profiles").update(profileUpdates).eq("id", user.id);
    }

    if (Object.keys(updates).length > 1) {
      await supabase.from("ai_settings").upsert({
        user_id: user.id,
        ...updates,
      }, { onConflict: "user_id" });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
