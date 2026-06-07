import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Diagnostic endpoint — reports which environment variables the running
 * deployment can see (booleans only, never the secret values) and can run
 * a live probe against external job APIs to surface the real error.
 *
 * - /api/diagnostics            → env var presence check
 * - /api/diagnostics?probe=1    → also performs a live Adzuna + Apify test call
 *
 * Requires authentication.
 */
export async function GET(req: NextRequest) {
  try {
    await requireUser();

    const isSet = (v: string | undefined) => !!v && v.trim().length > 0;

    const env = {
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
    };

    const probe = req.nextUrl.searchParams.get("probe");
    if (!probe) {
      return NextResponse.json(env);
    }

    // ── Live probes ──────────────────────────────────────────────
    const probes: Record<string, unknown> = {};

    // Adzuna: minimal real search call
    probes.adzuna = await probeAdzuna();

    // Apify: validate token via the user/me endpoint
    probes.apify = await probeApify();

    return NextResponse.json({ env, probes });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}

async function probeAdzuna() {
  const appId = process.env.ADZUNA_APP_ID;
  const appKey = process.env.ADZUNA_APP_KEY;
  const country = process.env.ADZUNA_COUNTRY || "us";
  if (!appId || !appKey) return { ok: false, reason: "credentials not set" };

  const params = new URLSearchParams({
    app_id: appId,
    app_key: appKey,
    results_per_page: "1",
    what: "software engineer",
  });
  const url = `https://api.adzuna.com/v1/api/jobs/${country}/search/1?${params.toString()}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "JobRadar/1.0" },
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    let count: number | undefined;
    try {
      count = JSON.parse(text)?.count;
    } catch {
      /* non-JSON body */
    }
    return {
      ok: res.ok,
      status: res.status,
      country,
      resultCount: count,
      // truncated body so we can see the real error message from Adzuna
      body: res.ok ? undefined : text.slice(0, 400),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function probeApify() {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) return { ok: false, reason: "token not set" };
  try {
    const res = await fetch(`https://api.apify.com/v2/users/me?token=${token}`, {
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    return {
      ok: res.ok,
      status: res.status,
      body: res.ok ? undefined : text.slice(0, 400),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
