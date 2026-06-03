"use client";
import { useState } from "react";
import { KanbanSquare, Mail, CheckCircle } from "lucide-react";
import KanbanBoard from "@/components/pipeline/KanbanBoard";
import toast from "react-hot-toast";

export default function PipelinePage() {
  const [isSendingDigest, setIsSendingDigest] = useState(false);

  const handleSendDigest = async () => {
    if (isSendingDigest) return;
    setIsSendingDigest(true);
    try {
      const res = await fetch("/api/email-digest", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        toast.success(`Daily digest sent to ${data.sentTo}`);
      } else if (data.code === "RESEND_ERROR") {
        toast.error(`⚠️ Email digest failed — ${data.error}`);
      } else {
        toast.error(data.error || "Failed to send digest");
      }
    } catch {
      toast.error("Failed to send email digest");
    } finally {
      setIsSendingDigest(false);
    }
  };

  return (
    <main className="mx-auto max-w-[1600px] px-4 pb-16 pt-24 md:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <KanbanSquare className="h-6 w-6 text-signal-cyan" />
            My Pipeline
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Drag and drop jobs through your application stages
          </p>
        </div>
        <button
          onClick={handleSendDigest}
          disabled={isSendingDigest}
          className="flex items-center gap-2 rounded-xl border border-signal-cyan/20 bg-signal-cyan/10 px-4 py-2.5 text-sm font-medium text-signal-cyan hover:bg-signal-cyan/20 transition-all disabled:opacity-50"
        >
          {isSendingDigest ? (
            <CheckCircle className="h-4 w-4 animate-pulse" />
          ) : (
            <Mail className="h-4 w-4" />
          )}
          Send Daily Digest
        </button>
      </div>

      {/* Stage Legend */}
      <div className="mb-6 flex flex-wrap gap-2">
        {[
          { label: "Saved", emoji: "🔖", hint: "Jobs you want to track" },
          { label: "Applied", emoji: "📤", hint: "Applications submitted" },
          { label: "Phone Screen", emoji: "📞", hint: "Initial screening" },
          { label: "Interview", emoji: "🤝", hint: "Active interviewing" },
          { label: "Offer", emoji: "🏆", hint: "Received an offer" },
          { label: "Rejected", emoji: "❌", hint: "Not moving forward" },
        ].map((stage) => (
          <div
            key={stage.label}
            title={stage.hint}
            className="flex items-center gap-1.5 rounded-lg border border-signal-cyan/15 bg-signal-surface/50 px-2.5 py-1.5 text-xs text-gray-500 cursor-default"
          >
            <span>{stage.emoji}</span>
            <span>{stage.label}</span>
          </div>
        ))}
      </div>

      {/* Kanban Board */}
      <KanbanBoard />
    </main>
  );
}
