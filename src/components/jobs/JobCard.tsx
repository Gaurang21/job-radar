"use client";
import { useState } from "react";
import {
  MapPin,
  Building2,
  Clock,
  DollarSign,
  Bookmark,
  ExternalLink,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { cn, formatSalary, formatRelativeDate, isClosingSoon, getScoreColor } from "@/lib/utils";
import { ScoreBadge } from "@/components/ui/Badge";
import Badge from "@/components/ui/Badge";
import type { Job } from "@/types";
import { useAppStore } from "@/store/useAppStore";
import toast from "react-hot-toast";

interface Props {
  job: Job;
  onClick: () => void;
  onCoverLetter: () => void;
  index?: number;
}

const SOURCE_COLORS: Record<string, string> = {
  adzuna: "ghost",
  linkedin: "cyan",
  indeed: "violet",
  manual: "success",
};

const SOURCE_LABELS: Record<string, string> = {
  adzuna: "Adzuna",
  linkedin: "LinkedIn",
  indeed: "Indeed",
  manual: "Saved",
};

export default function JobCard({ job, onClick, onCoverLetter, index = 0 }: Props) {
  const [isSaving, setIsSaving] = useState(false);
  const { updateJob } = useAppStore();
  const closing = isClosingSoon(job.closingDate);

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaving) return;
    setIsSaving(true);

    try {
      const newSaved = !job.saved;
      // Add to pipeline
      if (newSaved) {
        const res = await fetch("/api/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: job.id, stage: "saved" }),
        });
        if (res.ok) {
          updateJob(job.id, { saved: true });
          toast.success("Saved to pipeline");
        }
      } else {
        await fetch(`/api/jobs/${job.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ saved: false }),
        });
        updateJob(job.id, { saved: false });
        toast("Removed from saved");
      }
    } catch {
      toast.error("Failed to save job");
    } finally {
      setIsSaving(false);
    }
  };

  const handleQuickApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(job.applicationUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div
      onClick={onClick}
      className="glass-card group cursor-pointer p-5 animate-fade-up transition-card"
      style={{ animationDelay: `${Math.min(index * 40, 400)}ms`, animationFillMode: "both" }}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Company Initial */}
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-signal-cyan/20 to-signal-violet/20 border border-white/[0.08] text-sm font-bold text-gray-300 uppercase">
          {job.company.slice(0, 2)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-gray-100 group-hover:text-white transition-colors">
                {job.title}
              </h3>
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{job.company}</span>
              </div>
            </div>
            {/* Score Badge */}
            <ScoreBadge score={job.matchScore} />
          </div>
        </div>
      </div>

      {/* Meta Row */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {job.location && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="h-3 w-3" />
            {job.location}
          </span>
        )}
        {(job.salaryMin || job.salaryMax) && (
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <DollarSign className="h-3 w-3" />
            {formatSalary(job.salaryMin, job.salaryMax)}
          </span>
        )}
        <span className="flex items-center gap-1 text-xs text-gray-500">
          <Clock className="h-3 w-3" />
          {formatRelativeDate(job.postedDate ?? job.createdAt)}
        </span>
      </div>

      {/* Badges Row */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {job.jobType && (
          <Badge variant="ghost" size="sm">{job.jobType}</Badge>
        )}
        {job.seniority && (
          <Badge variant="ghost" size="sm">{job.seniority}</Badge>
        )}
        <Badge variant={SOURCE_COLORS[job.source] as "ghost" | "cyan" | "violet" | "success"} size="sm">
          {SOURCE_LABELS[job.source] ?? job.source}
        </Badge>
        {closing && (
          <Badge variant="warning" size="sm">
            <AlertTriangle className="h-2.5 w-2.5" />
            Closing soon
          </Badge>
        )}
        {job.duplicateSources && job.duplicateSources.length > 0 && (
          <Badge variant="ghost" size="sm">
            Also on {job.duplicateSources.join(", ")}
          </Badge>
        )}
      </div>

      {/* Description */}
      <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-gray-500">
        {job.description.slice(0, 200)}
      </p>

      {/* Action Bar */}
      <div className="mt-4 flex items-center justify-between border-t border-white/[0.04] pt-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handleQuickApply}
            className="flex items-center gap-1.5 rounded-lg bg-signal-cyan/10 border border-signal-cyan/20 px-3 py-1.5 text-xs font-medium text-signal-cyan hover:bg-signal-cyan/20 transition-all"
          >
            <ExternalLink className="h-3 w-3" />
            Apply
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onCoverLetter(); }}
            className="flex items-center gap-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-200 hover:bg-white/[0.08] transition-all"
          >
            <Zap className="h-3 w-3" />
            Cover Letter
          </button>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "rounded-lg p-1.5 transition-all",
            job.saved
              ? "text-signal-cyan bg-signal-cyan/10"
              : "text-gray-500 hover:text-signal-cyan hover:bg-signal-cyan/10"
          )}
        >
          <Bookmark className={cn("h-4 w-4", job.saved && "fill-signal-cyan")} />
        </button>
      </div>
    </div>
  );
}
