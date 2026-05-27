"use client";
import { useEffect, useState } from "react";
import { Loader2, MessageSquareText, Save, Sparkles } from "lucide-react";
import Modal from "@/components/ui/Modal";
import type { Job, InterviewPrepResult } from "@/types";
import toast from "react-hot-toast";

interface Props {
  job: Job | null;
  onClose: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  behavioral: "bg-signal-violet/10 text-signal-violet border-signal-violet/20",
  technical: "bg-signal-cyan/10 text-signal-cyan border-signal-cyan/20",
  experience: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  company: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export default function InterviewPrepModal({ job, onClose }: Props) {
  const [data, setData] = useState<InterviewPrepResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!job) return;
    setData(null);
    setIsLoading(true);
    fetch("/api/ai/interview-prep", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job.id }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.questions) setData({ questions: d.questions });
        else toast.error(d.error || "Failed");
      })
      .catch(() => toast.error("Failed to generate"))
      .finally(() => setIsLoading(false));
  }, [job?.id]);

  const handleSaveToPipeline = async () => {
    if (!job || !data) return;
    const formatted = data.questions
      .map((q, i) => `${i + 1}. [${q.category}] ${q.question}\n   Framework: ${q.framework}`)
      .join("\n\n");
    try {
      // Find pipeline item for this job
      const pipelineRes = await fetch("/api/pipeline");
      const pipelineData = await pipelineRes.json();
      const item = pipelineData.items?.find((i: { job_id: string }) => i.job_id === job.id);
      if (!item) {
        // Add to pipeline first
        const addRes = await fetch("/api/pipeline", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: job.id, stage: "saved" }),
        });
        const addData = await addRes.json();
        if (!addData.item) { toast.error("Couldn't save"); return; }
        await fetch(`/api/pipeline/${addData.item.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: `INTERVIEW PREP:\n\n${formatted}` }),
        });
      } else {
        await fetch(`/api/pipeline/${item.id}`, {
          method: "PATCH", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notes: `INTERVIEW PREP:\n\n${formatted}` }),
        });
      }
      toast.success("Saved to pipeline notes!");
    } catch {
      toast.error("Failed to save");
    }
  };

  if (!job) return null;

  return (
    <Modal isOpen={!!job} onClose={onClose} size="xl">
      <div className="flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-signal-cyan/20">
                <MessageSquareText className="h-3 w-3 text-signal-cyan" />
              </div>
              <h2 className="text-base font-semibold text-gray-100">Interview Prep</h2>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">{job.title} at {job.company}</p>
          </div>
          {!isLoading && data && (
            <button onClick={handleSaveToPipeline} className="flex items-center gap-1.5 rounded-lg border border-signal-cyan/30 bg-signal-cyan/10 px-3 py-1.5 text-xs font-medium text-signal-cyan hover:bg-signal-cyan/20">
              <Save className="h-3.5 w-3.5" /> Save to pipeline notes
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-signal-cyan" />
              <p className="text-sm text-gray-400">Generating likely interview questions…</p>
            </div>
          ) : data ? (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 mb-4">
                <Sparkles className="inline h-3 w-3 mr-1 text-signal-violet" />
                AI-generated questions tailored to this job + your resume
              </p>
              {data.questions.map((q, i) => (
                <div key={i} className="rounded-xl border border-white/[0.06] bg-signal-bg/50 p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-signal-cyan/20 text-xs font-bold text-signal-cyan">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider ${CATEGORY_COLORS[q.category]}`}>
                          {q.category}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-200">{q.question}</p>
                    </div>
                  </div>
                  <div className="ml-9 rounded-lg border border-white/[0.04] bg-signal-bg/50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-600 mb-1">Answer Framework</p>
                    <p className="text-sm text-gray-400 leading-relaxed">{q.framework}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
