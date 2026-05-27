import { decrypt } from "@/lib/crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { AISettings } from "@/types";

/**
 * Resolve the AI context for a user:
 * - Their personal API key (decrypted from DB) if set
 * - Otherwise fall back to env ANTHROPIC_API_KEY
 * - Their feature toggles from ai_settings table
 */
export async function resolveAIContext(
  supabase: SupabaseClient,
  userId: string
): Promise<{ apiKey: string | null; settings: Partial<AISettings> }> {
  const { data: settings } = await supabase
    .from("ai_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  let apiKey: string | null = null;
  if (settings?.anthropic_api_key_encrypted) {
    apiKey = decrypt(settings.anthropic_api_key_encrypted);
  }
  if (!apiKey) apiKey = process.env.ANTHROPIC_API_KEY ?? null;

  return {
    apiKey,
    settings: settings ?? {},
  };
}
