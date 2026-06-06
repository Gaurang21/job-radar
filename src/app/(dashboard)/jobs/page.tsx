"use client";
import { useEffect, useState, useCallback } from "react";
import { Target, Upload } from "lucide-react";
import RadarView from "@/components/jobs/RadarView";
import ResumeUpload from "@/components/resume/ResumeUpload";
import JobDrawer from "@/components/jobs/JobDrawer";
import CoverLetterModal from "@/components/cover-letter/CoverLetterModal";
import InterviewPrepModal from "@/components/ai/InterviewPrepModal";
import EmailDraftModal from "@/components/ai/EmailDraftModal";
import { useAppStore } from "@/store/useAppStore";
import type { Job } from "@/types";

export default function JobsPage() {
  const {
    jobs, totalJobs,
    setJobs, isLoadingJobs, setLoadingJobs,
    filters, sortBy,
    selectedJobId, setSelectedJobId,
  } = useAppStore();

  const [showUpload, setShowUpload] = useState(false);
  const [coverLetterJob, setCoverLetterJob] = useState<Job | null>(null);
  const [interviewPrepJob, setInterviewPrepJob] = useState<Job | null>(null);
  const [emailDraftJob, setEmailDraftJob] = useState<Job | null>(null);

  const loadJobs = useCallback(
    async (page = 1) => {
      setLoadingJobs(true);
      try {
        // Load all for radar (higher pageSize)
        const params = new URLSearchParams({ page: String(page), sortBy, pageSize: "100" });
        if (filters.search) params.set("search", filters.search);
        if (filters.jobType) params.set("jobType", filters.jobType);
        if (filters.seniority) params.set("seniority", filters.seniority);
        if (filters.source) params.set("source", filters.source);
        if (filters.minScore != null) params.set("minScore", String(filters.minScore));

        const res = await fetch(`/api/jobs?${params}`);
        const data = await res.json();
        setJobs(data.jobs ?? [], data.total ?? 0, data.page ?? 1, data.totalPages ?? 1);
      } finally {
        setLoadingJobs(false);
      }
    },
    [filters, sortBy, setJobs, setLoadingJobs]
  );

  useEffect(() => {
    loadJobs(1);
  }, [filters, sortBy]);

  useEffect(() => {
    const handler = () => loadJobs(1);
    window.addEventListener("jobs-refreshed", handler);
    return () => window.removeEventListener("jobs-refreshed", handler);
  }, [loadJobs]);

  const handleCoverLetter = (job: Job) => {
    setSelectedJobId(null);
    setCoverLetterJob(job);
  };

  const handleInterviewPrep = (job: Job) => {
    setSelectedJobId(null);
    setInterviewPrepJob(job);
  };

  const handleEmailDraft = (job: Job) => {
    setSelectedJobId(null);
    setEmailDraftJob(job);
  };

  return (
    <main className="w-full px-4 pb-16 pt-24 md:px-8">
      {/* ── Header ── */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2.5">
            <Target className="h-6 w-6 text-signal-cyan" />
            Job Radar
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {totalJobs > 0
              ? `${totalJobs} jobs plotted — score vs. freshness`
              : "Fetch jobs to populate your radar"}
          </p>
        </div>
        <button
          onClick={() => setShowUpload((v) => !v)}
          className="flex items-center gap-2 rounded-lg border border-signal-cyan/30 px-4 py-2 text-sm font-medium text-signal-cyan hover:bg-signal-cyan/10 transition-all"
        >
          <Upload className="h-4 w-4" />
          {showUpload ? "Cancel" : "Upload Resume"}
        </button>
      </div>

      {/* ── Resume upload panel ── */}
      {showUpload && (
        <div className="mb-6 max-w-lg">
          <ResumeUpload compact onSuccess={() => setShowUpload(false)} />
        </div>
      )}

      {/* ── Radar scatter view ── */}
      <RadarView
        jobs={jobs}
        totalJobs={totalJobs}
        isLoading={isLoadingJobs}
        onSelectJob={(id) => setSelectedJobId(id)}
      />

      {/* ── Job Detail Drawer ── */}
      <JobDrawer
        jobId={selectedJobId}
        onClose={() => setSelectedJobId(null)}
        onCoverLetter={handleCoverLetter}
        onInterviewPrep={handleInterviewPrep}
        onEmailDraft={handleEmailDraft}
      />

      {/* ── Modals ── */}
      <CoverLetterModal
        job={coverLetterJob}
        onClose={() => setCoverLetterJob(null)}
      />
      <InterviewPrepModal
        job={interviewPrepJob}
        onClose={() => setInterviewPrepJob(null)}
      />
      <EmailDraftModal
        job={emailDraftJob}
        onClose={() => setEmailDraftJob(null)}
      />
    </main>
  );
}
