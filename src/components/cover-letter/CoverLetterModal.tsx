"use client";
import { useState, useEffect } from "react";
import { Copy, Download, Loader2, Zap, CheckCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import type { Job } from "@/types";
import toast from "react-hot-toast";

interface Props {
  job: Job | null;
  onClose: () => void;
}

export default function CoverLetterModal({ job, onClose }: Props) {
  const [content, setContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (job) {
      setContent("");
      generateCoverLetter();
    }
  }, [job?.id]);

  const generateCoverLetter = async () => {
    if (!job || isGenerating) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "ANTHROPIC_ERROR") {
          toast.error("⚠️ AI unavailable — check your Anthropic API key");
        } else {
          toast.error(data.error || "Generation failed");
        }
        onClose();
        return;
      }
      setContent(data.coverLetter);
    } catch {
      toast.error("Failed to generate cover letter");
      onClose();
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async () => {
    try {
      // Dynamic import to avoid SSR issues
      const { Document, Paragraph, TextRun, Packer } = await import("docx");
      const { saveAs } = await import("file-saver");

      const paragraphs = content.split("\n\n").filter(Boolean).map(
        (text) =>
          new Paragraph({
            children: [new TextRun({ text, size: 24, font: "Calibri" })],
            spacing: { after: 200 },
          })
      );

      const doc = new Document({ sections: [{ properties: {}, children: paragraphs }] });
      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Cover_Letter_${job?.company?.replace(/\s+/g, "_")}.docx`);
      toast.success("Downloaded as DOCX");
    } catch {
      // Fallback: download as .txt
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Cover_Letter_${job?.company?.replace(/\s+/g, "_")}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  if (!job) return null;

  return (
    <Modal isOpen={!!job} onClose={onClose} size="lg">
      <div className="flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-signal-violet/20">
                <Zap className="h-3 w-3 text-signal-violet" />
              </div>
              <h2 className="text-base font-semibold text-gray-100">Cover Letter</h2>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">
              {job.title} at {job.company}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isGenerating && content && (
              <>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 transition-all"
                >
                  {copied ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 rounded-lg border border-signal-cyan/30 bg-signal-cyan/10 px-3 py-1.5 text-xs font-medium text-signal-cyan hover:bg-signal-cyan/20 transition-all"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {isGenerating ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="relative">
                <Loader2 className="h-8 w-8 animate-spin text-signal-violet" />
                <div className="absolute inset-0 blur-lg bg-signal-violet/30 rounded-full" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-gray-200">Crafting your cover letter…</p>
                <p className="mt-1 text-xs text-gray-500">Claude is personalizing it for {job.company}</p>
              </div>
            </div>
          ) : content ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[400px] rounded-xl border border-white/[0.08] bg-signal-bg/50 p-4 text-sm text-gray-300 leading-relaxed focus:border-signal-cyan/30 focus:outline-none resize-none transition-colors"
              placeholder="Cover letter will appear here…"
            />
          ) : null}
        </div>

        {/* Footer: Regenerate */}
        {!isGenerating && content && (
          <div className="border-t border-white/[0.06] px-6 py-3">
            <button
              onClick={generateCoverLetter}
              className="text-xs text-gray-500 hover:text-signal-violet transition-colors"
            >
              ↺ Regenerate
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
