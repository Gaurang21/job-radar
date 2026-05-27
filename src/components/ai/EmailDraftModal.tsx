"use client";
import { useEffect, useState } from "react";
import { Loader2, Mail, Copy, CheckCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import type { Job, EmailTone } from "@/types";
import toast from "react-hot-toast";

interface Props {
  job: Job | null;
  onClose: () => void;
}

export default function EmailDraftModal({ job, onClose }: Props) {
  const [content, setContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [tone, setTone] = useState<EmailTone>("formal");
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!job) return;
    setRecipientName(job.hiring_manager ?? "");
    setRecipientEmail("");
    generate("formal", job.hiring_manager ?? "", "");
  }, [job?.id]);

  const generate = async (newTone: EmailTone, name: string, email: string) => {
    if (!job || isLoading) return;
    setIsLoading(true);
    setTone(newTone);
    try {
      const res = await fetch("/api/ai/email-draft", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, tone: newTone, recipientName: name || null, recipientEmail: email || null }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed"); onClose(); return; }
      setContent(data.email);
    } catch {
      toast.error("Failed to generate");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    toast.success("Copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!job) return null;

  return (
    <Modal isOpen={!!job} onClose={onClose} size="lg">
      <div className="flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20">
                <Mail className="h-3 w-3 text-emerald-400" />
              </div>
              <h2 className="text-base font-semibold text-gray-100">Outreach Email</h2>
            </div>
            <p className="mt-0.5 text-xs text-gray-500">{job.title} at {job.company}</p>
          </div>
          {!isLoading && content && (
            <button onClick={handleCopy} className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20">
              {copied ? <CheckCircle className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy email"}
            </button>
          )}
        </div>

        {/* Recipient + Tone */}
        <div className="border-b border-white/[0.06] px-6 py-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Recipient name"
              className="rounded-lg border border-white/[0.08] bg-signal-bg/50 px-3 py-2 text-xs text-gray-300 focus:border-emerald-500/30 focus:outline-none" />
            <input value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="email@company.com"
              className="rounded-lg border border-white/[0.08] bg-signal-bg/50 px-3 py-2 text-xs text-gray-300 focus:border-emerald-500/30 focus:outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Tone:</span>
            {(["formal", "casual"] as EmailTone[]).map((t) => (
              <button key={t} disabled={isLoading} onClick={() => generate(t, recipientName, recipientEmail)}
                className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${
                  tone === t ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/[0.04] text-gray-400 hover:text-gray-200 border border-white/[0.06]"
                }`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
            <button disabled={isLoading} onClick={() => generate(tone, recipientName, recipientEmail)}
              className="ml-auto rounded-lg bg-emerald-500/20 px-3 py-1 text-xs font-medium text-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50">
              ↺ Regenerate
            </button>
          </div>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
              <p className="text-sm text-gray-400">Drafting email…</p>
            </div>
          ) : (
            <textarea value={content} onChange={(e) => setContent(e.target.value)}
              className="w-full min-h-[350px] rounded-xl border border-white/[0.08] bg-signal-bg/50 p-4 text-sm text-gray-300 leading-relaxed font-mono focus:border-emerald-500/30 focus:outline-none resize-none" />
          )}
        </div>
      </div>
    </Modal>
  );
}
