"use client";
import { useEffect, useState } from "react";
import {
  X, MapPin, Building2, DollarSign, Clock, ExternalLink,
  CheckCircle, User, Linkedin, Briefcase, ChevronRight,
  Zap, Bookmark, Globe,
} from "lucide-react";
import { cn, formatSalary, formatRelativeDate, formatDate } from "@/lib/utils";
import { ScoreBadge } from "@/components/ui/Badge";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import type { Job } from "@/types";
import { useAppStore } from "@/store/useAppStore";
import toast from "react-hot-toast";

interface Props {
  jobId: string | null;
  onClose: () => void;
  onCoverLetter: (job: Job) => void;
}

export default function JobDrawer({ jobId, onClose, onCoverLetter }: Props) {
  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  const isOpen = !!jobId;

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-full flex-col bg-signal-surface border-l border-white/[0.06] shadow-signal-lg transition-transform duration-300 ease-out md:w-[680px] lg:w-[720px]",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-3">
            {job && (
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-signal-cyan/20 to-signal-violet/20 text-sm font-bold text-gray-300 uppercase border border-white/[0.08]">
                {job.company.slice(0, 2)}
              </div>
            )}
            <div>
              {job ? (
                <>
                  <h2 className="font-semibold text-gray-100 line-clamp-1">{job.title}</h2>
                  <p className="text-xs text-gray-500">{job.company}</p>
                </>
              ) : (
                <div className="h-5 w-40 shimmer rounded" />
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-white/[0.06] hover:text-gray-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Spinner size="lg" />
            </div>
          ) : !job ? (
            <div className="flex items-center justify-center py-20 text-gray-500">
              Job not found
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {/* Score + CTA */}
              <div className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-signal-bg/50 p-4">
                <div className="flex items-center gap-3">
                  <ScoreBadge score={job.matchScore} size="lg" />
                  <div>
                    <p className="text-sm font-medium text-gray-200">
                      {job.matchScore != null
                        ? job.matchScore >= 80 ? "Excellent match" : job.matchScore >= 50 ? "Good match" : "Partial match"
                        : "Not scored yet"}
                    </p>
                    <p className="text-xs text-gray-500">vs your profile</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-xs font-medium transition-all",
                      job.saved
                        ? "border-signal-cyan/30 bg-signal-cyan/10 text-signal-cyan"
                        : "border-white/[0.08] bg-white/[0.04] text-gray-400 hover:text-gray-200"
                    )}
                  >
                    <Bookmark className={cn("h-3.5 w-3.5 inline mr-1", job.saved && "fill-signal-cyan")} />
                    {job.saved ? "Saved" : "Save"}
                  </button>
                  <a
                    href={job.applicationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 rounded-lg bg-signal-cyan px-4 py-2 text-xs font-semibold text-signal-bg hover:bg-signal-cyan/90 transition-colors"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Apply Now
                  </a>
                </div>
              </div>

              {/* Meta Grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: MapPin, label: "Location", value: job.location ?? "Not specified" },
                  { icon: DollarSign, label: "Salary", value: formatSalary(job.salaryMin, job.salaryMax) },
                  { icon: Briefcase, label: "Type", value: job.jobType ?? "Not specified" },
                  { icon: Clock, label: "Posted", value: formatRelativeDate(job.postedDate ?? job.createdAt) },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label} className="rounded-lg border border-white/[0.06] bg-signal-bg/30 p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-3.5 w-3.5 text-signal-cyan" />
                      <span className="text-[11px] font-medium uppercase tracking-wider text-gray-600">{label}</span>
                    </div>
                    <p className="text-sm text-gray-300">{value}</p>
                  </div>
                ))}
              </div>

              {/* Why You Match */}
              {job.whyMatch && (
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="h-5 w-5 rounded-full bg-emerald-500/20 flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 text-emerald-400" />
                    </div>
                    <h3 className="text-sm font-semibold text-emerald-400">Why You Match</h3>
                  </div>
                  <p className="text-sm text-gray-300 leading-relaxed mb-3">{job.whyMatch}</p>
                  {job.matchReasons && job.matchReasons.length > 0 && (
                    <ul className="space-y-1.5">
                      {job.matchReasons.map((r, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-gray-400">
                          <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Hiring Manager */}
              {job.hiringManager && (
                <div className="flex items-center gap-3 rounded-lg border border-white/[0.06] bg-signal-bg/30 p-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-signal-violet/20">
                    <User className="h-4 w-4 text-signal-violet" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-200">{job.hiringManager}</p>
                    <p className="text-xs text-gray-500">Hiring Manager</p>
                  </div>
                  {job.hiringManagerUrl && (
                    <a
                      href={job.hiringManagerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-signal-cyan hover:text-signal-cyan/80 transition-colors"
                    >
                      <Linkedin className="h-4 w-4" />
                    </a>
                  )}
                </div>
              )}

              {/* Company Info */}
              {(job.companySize || job.companyIndustry || job.companyFunding || job.companyRating) && (
                <div className="rounded-xl border border-white/[0.06] bg-signal-bg/30 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Globe className="h-4 w-4 text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-300">Company</h3>
                    <span className="text-sm font-medium text-gray-200">{job.company}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {job.companySize && <div className="text-xs text-gray-500">Size: <span className="text-gray-300">{job.companySize}</span></div>}
                    {job.companyIndustry && <div className="text-xs text-gray-500">Industry: <span className="text-gray-300">{job.companyIndustry}</span></div>}
                    {job.companyFunding && <div className="text-xs text-gray-500">Stage: <span className="text-gray-300">{job.companyFunding}</span></div>}
                    {job.companyRating && <div className="text-xs text-gray-500">Rating: <span className="text-emerald-400">{job.companyRating}★</span></div>}
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-300">Job Description</h3>
                <div
                  className="job-description text-sm text-gray-400 leading-relaxed whitespace-pre-wrap"
                  style={{ maxHeight: "400px", overflowY: "auto" }}
                >
                  {job.description}
                </div>
              </div>

              {/* Cover Letter CTA */}
              <button
                onClick={() => onCoverLetter(job)}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-signal-violet/30 bg-signal-violet/10 py-3 text-sm font-medium text-signal-violet hover:bg-signal-violet/20 transition-all"
              >
                <Zap className="h-4 w-4" />
                Generate Cover Letter with AI
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
