"use client";
import { useEffect } from "react";
import { CheckCircle, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMatchStream } from "@/hooks/useMatchStream";
import { ScoreBadge } from "@/components/ui/Badge";

interface Props {
  jobId: string;
}

/**
 * Expandable panel that streams a "Why this role matches you" explanation.
 * Reasoning steps fill in live as the server reaches each analysis phase;
 * the explanation streams token-by-token beneath them, ending in a
 * verdict + 0-100 score. Unmounting (collapsing the panel) aborts the
 * in-flight stream via the hook's AbortController.
 */
export default function WhyMatchPanel({ jobId }: Props) {
  const { steps, text, score, latencyMs, status, error, start } = useMatchStream();

  useEffect(() => {
    start(jobId);
    // useMatchStream aborts the in-flight request on unmount
  }, [jobId, start]);

  return (
    <div
      className="mt-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 animate-fade-up"
      onClick={(e) => e.stopPropagation()} // don't open the job drawer
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-emerald-400" />
          <h4 className="text-sm font-semibold text-emerald-400">Why this matches</h4>
        </div>
        {status === "done" && score != null && <ScoreBadge score={score} />}
      </div>

      {/* Live reasoning steps */}
      {steps.length > 0 && (
        <ul className="mb-3 space-y-1.5">
          {steps.map((s) => (
            <li key={s.id} className="flex items-center gap-2 text-xs">
              {s.done ? (
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-emerald-400" />
              ) : (
                <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin text-emerald-300" />
              )}
              <span className={cn(s.done ? "text-gray-500" : "text-emerald-300")}>{s.label}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Streamed explanation with typing cursor */}
      {(text || status === "streaming") && (
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
          {text}
          {status === "streaming" && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-emerald-400 align-text-bottom" />
          )}
        </p>
      )}

      {status === "error" && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-red-400">{error ?? "Something went wrong"}</p>
          <button
            onClick={() => start(jobId)}
            className="flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-gray-300 hover:bg-white/[0.08] transition-all"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}

      {status === "done" && latencyMs != null && (
        <p className="mt-3 text-[11px] text-gray-600">Analyzed in {(latencyMs / 1000).toFixed(1)}s</p>
      )}
    </div>
  );
}
