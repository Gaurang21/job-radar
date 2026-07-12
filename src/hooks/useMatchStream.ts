"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MatchStreamFrame, MatchStreamStepId } from "@/types";

export type MatchStreamStatus = "idle" | "streaming" | "done" | "error";

export interface MatchStreamStep {
  id: MatchStreamStepId;
  label: string;
  done: boolean;
}

interface UseMatchStreamReturn {
  steps: MatchStreamStep[];
  text: string;
  score: number | null;
  latencyMs: number | null;
  status: MatchStreamStatus;
  error: string | null;
  start: (jobId: string) => void;
  stop: () => void;
}

/**
 * Consumes the /api/ai/why-match-stream SSE endpoint with a manual parser:
 * frames are `data: {json}` blocks separated by \n\n. We buffer the tail
 * (a chunk can end mid-frame) and split on the delimiter each read.
 * The in-flight request is aborted via AbortController on stop()/unmount.
 */
export function useMatchStream(): UseMatchStreamReturn {
  const [steps, setSteps] = useState<MatchStreamStep[]>([]);
  const [text, setText] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [status, setStatus] = useState<MatchStreamStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  const handleFrame = useCallback((frame: MatchStreamFrame) => {
    switch (frame.type) {
      case "step":
        // A new step marks all previous steps complete
        setSteps((prev) => [
          ...prev.map((s) => ({ ...s, done: true })),
          { id: frame.step, label: frame.label, done: false },
        ]);
        break;
      case "delta":
        setText((prev) => prev + frame.text);
        break;
      case "done":
        setSteps((prev) => prev.map((s) => ({ ...s, done: true })));
        setScore(frame.score);
        setLatencyMs(frame.latencyMs);
        setStatus("done");
        break;
      case "error":
        setError(frame.message);
        setStatus("error");
        break;
      default: {
        // Exhaustiveness guard — a new frame type is a compile error here
        const _exhaustive: never = frame;
        return _exhaustive;
      }
    }
  }, []);

  const start = useCallback(
    (jobId: string) => {
      stop();
      const controller = new AbortController();
      abortRef.current = controller;

      setSteps([]);
      setText("");
      setScore(null);
      setLatencyMs(null);
      setError(null);
      setStatus("streaming");

      (async () => {
        try {
          const res = await fetch("/api/ai/why-match-stream", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId }),
            signal: controller.signal,
          });

          if (!res.ok || !res.body) {
            const data = await res.json().catch(() => null);
            throw new Error(data?.error ?? `Stream failed (${res.status})`);
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const events = buffer.split("\n\n");
            buffer = events.pop() ?? ""; // tail may be a partial frame — keep it

            for (const event of events) {
              for (const line of event.split("\n")) {
                if (!line.startsWith("data: ")) continue;
                try {
                  handleFrame(JSON.parse(line.slice(6)) as MatchStreamFrame);
                } catch {
                  /* skip malformed frame */
                }
              }
            }
          }

          // Stream closed without a done/error frame (e.g. server timeout)
          setStatus((prev) => (prev === "streaming" ? "done" : prev));
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            setStatus("idle"); // user closed the panel — not an error
            return;
          }
          setError(err instanceof Error ? err.message : "Stream failed");
          setStatus("error");
        }
      })();
    },
    [stop, handleFrame]
  );

  // Abort any in-flight stream on unmount
  useEffect(() => stop, [stop]);

  return { steps, text, score, latencyMs, status, error, start, stop };
}
