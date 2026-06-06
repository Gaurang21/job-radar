import { decrypt } from "@/lib/crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AISettings, AIProvider } from "@/types";

export async function resolveAIContext(
  supabase: SupabaseClient,
  userId: string
): Promise<{ apiKey: string | null; provider: AIProvider; settings: Partial<AISettings> }> {
  const { data: settings } = await supabase
    .from("ai_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  let provider: AIProvider = settings?.ai_provider ?? (process.env.GROQ_API_KEY ? "groq" : "anthropic");
  let apiKey: string | null = null;

  if (provider === "groq") {
    if (settings?.groq_api_key_encrypted) {
      apiKey = decrypt(settings.groq_api_key_encrypted);
    }
    if (!apiKey) apiKey = process.env.GROQ_API_KEY ?? null;
  } else {
    if (settings?.anthropic_api_key_encrypted) {
      apiKey = decrypt(settings.anthropic_api_key_encrypted);
    }
    if (!apiKey) apiKey = process.env.ANTHROPIC_API_KEY ?? null;
  }

  // If the chosen provider has no key, fall back to whichever env key is available
  if (!apiKey) {
    if (process.env.GROQ_API_KEY) {
      apiKey = process.env.GROQ_API_KEY;
      provider = "groq";
    } else if (process.env.ANTHROPIC_API_KEY) {
      apiKey = process.env.ANTHROPIC_API_KEY;
      provider = "anthropic";
    }
  }

  return { apiKey, provider, settings: settings ?? {} };
}
