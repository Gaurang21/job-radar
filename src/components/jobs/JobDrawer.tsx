"use client";
import { useEffect, useState } from "react";
import {
  X, MapPin, DollarSign, Clock, ExternalLink, CheckCircle,
  User, Linkedin, Briefcase, ChevronRight, Zap, Bookmark, Globe,
  AlertTriangle, MessageSquareText, Mail, Lightbulb, Sparkles,
} from "lucide-react";
import { cn, formatSalary, formatRelativeDate } from "@/lib/utils";
import { ScoreBadge } from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import type { Job, SkillGapResult, JobSummary } from "@/types";
import { useAppStore } from "@/store/useAppStore";
import toast from "react-hot-toast";

interface Props {
  jobId: string | null;
  onClose: () => void;
  onCoverLetter: (job: Job) => void;
  onInterviewPrep: (job: Job) => void;
  onEmailDraft: (job: Job) => void;
}

export default function JobDrawer({ jobId, onClose, onCoverLetter, onInterviewPrep, onEmailDraft }: Props) {
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isAnalyzingGaps, setIsAnalyzingGaps] = useState(false);
  const { updateJob } = useAppStore();

  useEffect(() => {
    if (!jobId) { setJob(null); return; }
    setIsLoading(true);
    fetch(`/api/jobs/${jobId}`)
      .then((r) => r.json())
      .then((data) => setJob(data.job ?? null))
      .catch(() => toast.error("Failed to load job details"))
      .finally(() => setIsLoading(false));
  }, [jobId]);

  const handleSave = async () => {
    if (!job || isSaving) return;
    setIsSaving(true);
    try {
      const newSaved = !job.saved;
      if (newSaved) {
        const res = await fetch("/api/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: job.id, stage: "saved" }),
        });
        if (res.ok) {
          setJob((j) => j ? { ...j, saved: true } : j);
          updateJob(job.id, { saved: true });
          toast.success("Saved to pipeline");
        }
      } else {
        await fetch(`/api/jobs/${job.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ saved: false }),
        });
        setJob((j) => j ? { ...j, saved: false } : j);
        updateJob(job.id, { saved: false });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSummarize = async () => {
    if (!job || isSummarizing) return;
    setIsSummarizing(true);
    try {
      const res = await fetch("/api/ai/job-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      const data = await res.json();
      if (data.summary) {
        setJob((j) => j ? { ...j, ai_summary: data.summary } : j);
        toast.success("Summarized!");
      } else {
        toast.error(data.error || "Could not summarize");
      }
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleAnalyzeGaps = async () => {
    if (!job || isAnalyzingGaps) return;
    setIsAnalyzingGaps(true);
    try {
      const res = await fetch("/api/ai/skill-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id }),
      });
      const data = await res.json();
      if (data.skillGaps) {
        setJob((j) => j ? { ...j, skill_gaps: data.skillGaps } : j);
        toast.success("Skill gaps analyzed!");
      } else {
        toast.error(data.error || "Could not analyze");
      }
    } finally {
      setIsAnalyzingGaps(false);
    }
  };

  const isOpen = !!jobId;

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />}

      <div className={cn(
        "fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-signal-surface border-l border-white/[0.06] shadow-signal-lg transition-transform duration-300 ease-out md:w-[720px] lg:w-[760px]",
        isOpen ? "translate-x-0" : "translate-x-full"
      )}>
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            {job && (
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-signal-cyan/20 to-signal-violet/20 text-sm font-bold text-gray-300 uppercase border border-white/[0.08]">
                {job.company.slice(0, 2)}
              </div>
            )}
            <div className="min-w-0">
              {job ? (
                <>
                  <h2 className="font-semibold text-gray-100 truncate">{job.title}</h2>
                  <p className="text-xs text-gray-500 truncate">{job.company}</p>
                </>
              ) : (<div className="h-5 w-40 shimmer rounded" />)}
            </div>
          </div>
          <button onClick={onClose} className="flex-shrink-0 rounded-lg p-1.5 text-gray-500 hover:bg-white/[0.06] hover:text-gray-300 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><Spinner size="lg" /></div>
          ) : !job ? (
            <div className="flex items-center justify-center py-20 text-gray-500">Job not found</div>
          ) : (
            <div className="p-6 space-y-6">

              {/* Score + CTAs */}
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-signal-bg/50 p-4">
                <div className="flex items-center gap-3">
                  <ScoreBadge score={job.match_score} size="lg" />
                  <div>
                    <p className="text-sm font-medium text-gray-200">
                      {job.match_score >= 80 ? "Excellent match" : job.match_score >= 50 ? "Good match" : job.match_score > 0 ? "Partial match" : "Not scored"}
                    </p>
                    <p className="text-xs text-gray-500">vs your profile</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleSave}
                    className={cn("rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                      job.saved ? "border-signal-cyan/30 bg-signal-cyan/10 text-signal-cyan" : "border-white/[0.08] bg-white/[0.04] text-gray-400 hover:text-gray-200")}>
                    <Bookmark className={cn("h-3.5 w-3.5 inline mr-1", job.saved && "fill-signal-cyan")} />
                    {job.saved ? "Saved" : "Save"}
                  </button>
                  <a href={job.application_url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-signal-cyan px-4 py-2 text-xs font-semibold text-signal-bg hover:bg-signal-cyan/90 transition-colors">
                    <ExternalLink className="h-3.5 w-3.5" /> Apply Now
                  </a>
                </div>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: MapPin, label: "Location", value: job.location ?? "Not specified" },
                  { icon: DollarSign, label: "Salary", value: formatSalary(job.salary_min, job.salary_max) },
                  { icon: Briefcase, label: "Type", value: job.job_type ?? "Not specified" },
                  { icon: Clock, label: "Posted", value: formatRelativeDate(job.posted_date ?? job.created_at) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-lg border border-white/[0.06] bg-signal-bg/30 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-3.5 w-3.5 text-signal-cyan" />
                      <span className="text-[11px] font-medium uppercase tracking-wider text-gray-600">{label}</span>
                    </div>
                    <p className="text-sm text-gray-300 truncate">{value}</p>
                  </div>
                ))}
              </div>

              {/* AI Summary */}
              {job.ai_summary ? (
                <div className="rounded-xl border border-signal-violet/20 bg-signal-violet/5 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-signal-violet" />
                    <h3 className="text-sm font-semibold text-signal-violet">AI Summary</h3>
                  </div>
                  <ul className="space-y-1.5">
                    {(job.ai_summary as JobSummary).bullets.map((bullet: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-signal-violet" />
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <button onClick={handleSummarize} disabled={isSummarizing}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-signal-violet/30 bg-signal-violet/10 py-2.5 text-sm font-medium text-signal-violet hover:bg-signal-violet/20 transition-all disabled:opacity-50">
                  {isSummarizing ? <Spinner size="sm" /> : <Sparkles className="h-4 w-4" />}
                  {isSummarizing ? "Summarizing…" : "Generate AI Summary (5 bullets)"}
                </button>
              )}

              {/* Why You Match */}
              {job.why_match && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <h3 className="text-sm font-semibold text-emerald-400">Why You Match</h3>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed mb-3">{job.why_match}</p>
                  {job.match_reasons && job.match_reasons.length > 0 && (
                    <ul className="space-y-1.5">
                      {job.match_reasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                          <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />{r}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Skill Gaps */}
              {job.skill_gaps ? (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-amber-400" />
                    <h3 className="text-sm font-semibold text-amber-400">Skill Gaps</h3>
                  </div>
                  {(job.skill_gaps as SkillGapResult).missing.length > 0 ? (
                    <ul className="space-y-2.5">
                      {(job.skill_gaps as SkillGapResult).missing.map((g, i) => (
                        <li key={i}>
                          <div className="flex items-center gap-2 text-sm font-medium text-amber-300">
                            <span className="text-amber-500">•</span> {g.skill}
                          </div>
                          <p className="mt-1 ml-4 text-xs text-gray-400">{g.advice}</p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-400">No major skill gaps detected!</p>
                  )}
                </div>
              ) : (
                <button onClick={handleAnalyzeGaps} disabled={isAnalyzingGaps}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 py-2.5 text-sm font-medium text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-50">
                  {isAnalyzingGaps ? <Spinner size="sm" /> : <Lightbulb className="h-4 w-4" />}
                  {isAnalyzingGaps ? "Analyzing…" : "Analyze Skill Gaps"}
                </button>
              )}

              {/* Hiring Manager */}
              {job.hiring_manager && (
                <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-signal-bg/30 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-signal-violet/20">
                    <User className="h-4 w-4 text-signal-violet" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-200">{job.hiring_manager}</p>
                    <p className="text-xs text-gray-500">Hiring Manager</p>
                  </div>
                  {job.hiring_manager_url && (
                    <a href={job.hiring_manager_url} target="_blank" rel="noopener noreferrer" className="text-signal-cyan hover:text-signal-cyan/80">
                      <Linkedin className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}

              {/* Company */}
              {(job.company_size || job.company_industry || job.company_funding || job.company_rating) && (
                <div className="rounded-xl border border-white/[0.06] bg-signal-bg/30 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-300">Company</h3>
                    <span className="text-sm font-medium text-gray-200">{job.company}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {job.company_size && <div className="text-gray-500">Size: <span className="text-gray-300">{job.company_size}</span></div>}
                    {job.company_industry && <div className="text-gray-500">Industry: <span className="text-gray-300">{job.company_industry}</span></div>}
                    {job.company_funding && <div className="text-gray-500">Stage: <span className="text-gray-300">{job.company_funding}</span></div>}
                    {job.company_rating && <div className="text-gray-500">Rating: <span className="text-emerald-400">{job.company_rating}★</span></div>}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-300">Job Description</h3>
                <div className="job-description text-sm text-gray-400 leading-relaxed whitespace-pre-wrap max-h-96 overflow-y-auto">
                  {job.description}
                </div>
              </div>

              {/* AI Action Buttons */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <button onClick={() => onCoverLetter(job)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-signal-violet/30 bg-signal-violet/10 py-2.5 text-sm font-medium text-signal-violet hover:bg-signal-violet/20 transition-all">
                  <Zap className="h-4 w-4" /> Cover Letter
                </button>
                <button onClick={() => onInterviewPrep(job)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-signal-cyan/30 bg-signal-cyan/10 py-2.5 text-sm font-medium text-signal-cyan hover:bg-signal-cyan/20 transition-all">
                  <MessageSquareText className="h-4 w-4" /> Interview Prep
                </button>
                <button onClick={() => onEmailDraft(job)}
                  className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/20 transition-all">
                  <Mail className="h-4 w-4" /> Outreach Email
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
