import { NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Diagnostic endpoint — reports which environment variables the running
 * deployment can actually see. Returns ONLY booleans (set / not set),
 * never the secret values. Requires authentication.
 *
 * Visit /api/diagnostics while logged in to verify your Vercel env config.
 */
export async function GET() {
  try {
    await requireUser();

    const isSet = (v: string | undefined) => !!v && v.trim().length > 0;

    return NextResponse.json({
      supabase: {
        NEXT_PUBLIC_SUPABASE_URL: isSet(process.env.NEXT_PUBLIC_SUPABASE_URL),
        NEXT_PUBLIC_SUPABASE_ANON_KEY: isSet(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
        SUPABASE_SERVICE_ROLE_KEY: isSet(process.env.SUPABASE_SERVICE_ROLE_KEY),
      },
      app: {
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? null,
        ENCRYPTION_KEY: isSet(process.env.ENCRYPTION_KEY),
      },
      ai: {
        ANTHROPIC_API_KEY: isSet(process.env.ANTHROPIC_API_KEY),
        GROQ_API_KEY: isSet(process.env.GROQ_API_KEY),
        AI_STUB_MODE: process.env.AI_STUB_MODE ?? null,
      },
      jobSources: {
        ADZUNA_APP_ID: isSet(process.env.ADZUNA_APP_ID),
        ADZUNA_APP_KEY: isSet(process.env.ADZUNA_APP_KEY),
        ADZUNA_COUNTRY: process.env.ADZUNA_COUNTRY ?? "us (default)",
        APIFY_API_TOKEN: isSet(process.env.APIFY_API_TOKEN),
      },
      email: {
        RESEND_API_KEY: isSet(process.env.RESEND_API_KEY),
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
