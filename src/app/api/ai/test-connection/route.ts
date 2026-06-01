import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/supabase/server";
import { testConnection } from "@/services/aiService";
import { decrypt } from "@/lib/crypto";
import type { AIProvider } from "@/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const body = await req.json().catch(() => ({}));

    const provider: AIProvider = body.provider ?? "anthropic";
    let apiKey = body.apiKey as string | undefined;

    if (!apiKey) {
      const { data: settings } = await supabase
        .from("ai_settings")
        .select("anthropic_api_key_encrypted, groq_api_key_encrypted")
        .eq("user_id", user.id)
        .maybeSingle();

      if (provider === "groq" && settings?.groq_api_key_encrypted) {
        apiKey = decrypt(settings.groq_api_key_encrypted) ?? undefined;
      } else if (settings?.anthropic_api_key_encrypted) {
        apiKey = decrypt(settings.anthropic_api_key_encrypted) ?? undefined;
      }
    }

    if (!apiKey) {
      apiKey = provider === "groq"
        ? process.env.GROQ_API_KEY
        : process.env.ANTHROPIC_API_KEY;
    }

    if (!apiKey) return NextResponse.json({ ok: false, error: "No API key provided" }, { status: 400 });

    const result = await testConnection(apiKey, provider);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
