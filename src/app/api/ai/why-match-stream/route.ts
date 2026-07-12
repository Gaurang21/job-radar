import { NextRequest, NextResponse } from "next/server";
import { requireUser, AuthError } from "@/lib/supabase/server";
import { streamMatchExplanation } from "@/services/aiService";
import { resolveAIContext } from "@/lib/ai-context";
import { rowToProfile } from "@/lib/utils";
import type { MatchStreamFrame } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * SSE endpoint streaming a "Why this role matches you" explanation.
 * Emits `data: {json}\n\n` frames typed as MatchStreamFrame:
 *   {type:"step"} → {type:"delta"}* → {type:"done", score, latencyMs}
 * or {type:"error"} on failure. Errors mid-stream are sent as frames
 * so the client never sees a dropped connection without context.
 */
export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await requireUser();
    const { jobId } = await req.json();
    if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

    const [{ data: job }, { data: profileRow }, ctx] = await Promise.all([
      supabase.from("jobs").select("*").eq("id", jobId).eq("user_id", user.id).maybeSingle(),
      supabase.from("resumes").select("*").eq("user_id", user.id).order("version", { ascending: false }).limit(1).maybeSingle(),
      resolveAIContext(supabase, user.id),
    ]);

    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    const profile = rowToProfile(profileRow);
    if (!profile) return NextResponse.json({ error: "Upload your resume first" }, { status: 400 });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const send = (frame: MatchStreamFrame) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(frame)}\n\n`));
        try {
          for await (const frame of streamMatchExplanation(ctx, job, profile)) {
            if (req.signal.aborted) break; // client closed the panel
            send(frame);
          }
        } catch (err) {
          try {
            send({ type: "error", message: err instanceof Error ? err.message : "Stream failed" });
          } catch {
            /* controller already closed by client abort */
          }
        } finally {
          try { controller.close(); } catch { /* already closed */ }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no", // disable proxy buffering so frames flush immediately
      },
    });
  } catch (err) {
    if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
