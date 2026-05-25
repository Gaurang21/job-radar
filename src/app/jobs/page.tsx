"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { Briefcase, SlidersHorizontal } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import JobCard from "@/components/jobs/JobCard";
import JobDrawer from "@/components/jobs/JobDrawer";
import JobFilters from "@/components/jobs/JobFilters";
import CoverLetterModal from "@/components/cover-letter/CoverLetterModal";
import Spinner from "@/components/ui/Spinner";
import { useAppStore } from "@/store/useAppStore";
import type { Job } from "@/types";

export default function JobsPage() {
  const {
    jobs, totalJobs, currentPage, totalPages,
    setJobs, isLoadingJobs, setLoadingJobs,
    filters, sortBy,
    selectedJobId, setSelectedJobId,
  } = useAppStore();

  const [coverLetterJob, setCoverLetterJob] = useState<Job | null>(null);
  const [showFilters, setShowFilters] = useState(true);
  const fetchedRef = useRef(false);

  const loadJobs = useCallback(
    async (page = 1) => {
      setLoadingJobs(true);
      try {
        const params = new URLSearchParams({ page: String(page), sortBy, pageSize: "20" });
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

  // Re-fetch when jobs are refreshed globally
  useEffect(() => {
    const handler = () => loadJobs(1);
    window.addEventListener("jobs-refreshed", handler);
    return () => window.removeEventListener("jobs-refreshed", handler);
  }, [loadJobs]);

  const handleCoverLetter = (job: Job) => {
    setSelectedJobId(null);
    setCoverLetterJob(job);
  };

  return (
    <div className="min-h-screen bg-signal-bg bg-signal-gradient">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-6">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-signal-cyan" />
              Job Board
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {totalJobs > 0
                ? `${totalJobs} jobs found, ranked by AI match score`
                : "Fetch jobs to get started"}
            </p>
          </div>
          <button
            onClick={() => setShowFilters((f) => !f)}
            className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-signal-surface px-3 py-2 text-sm text-gray-400 hover:text-gray-200 transition-all"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-6 rounded-2xl border border-white/[0.06] bg-signal-surface/50 p-4 animate-fade-down">
            <JobFilters />
          </div>
        )}

        {/* Job Grid */}
        {isLoadingJobs ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-64 rounded-2xl shimmer" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="mb-4 text-4xl">🔍</div>
            <h3 className="text-lg font-semibold text-gray-300">No jobs found</h3>
            <p className="mt-2 text-sm text-gray-500 max-w-sm">
              {Object.values(filters).some(Boolean)
                ? "Try adjusting your filters"
                : 'Click "Refresh" in the nav bar to fetch jobs from all sources'}
            </p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {jobs.map((job, i) => (
                <JobCard
                  key={job.id}
                  job={job}
                  index={i}
                  onClick={() => setSelectedJobId(job.id)}
                  onCoverLetter={() => handleCoverLetter(job)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => loadJobs(currentPage - 1)}
                  className="rounded-lg border border-white/[0.08] bg-signal-surface px-4 py-2 text-sm text-gray-400 hover:text-gray-200 disabled:opacity-40"
                >
                  ← Prev
                </button>
                <span className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => loadJobs(currentPage + 1)}
                  className="rounded-lg border border-white/[0.08] bg-signal-surface px-4 py-2 text-sm text-gray-400 hover:text-gray-200 disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Job Detail Drawer */}
      <JobDrawer
        jobId={selectedJobId}
        onClose={() => setSelectedJobId(null)}
        onCoverLetter={handleCoverLetter}
      />

      {/* Cover Letter Modal */}
      <CoverLetterModal
        job={coverLetterJob}
        onClose={() => setCoverLetterJob(null)}
      />
    </div>
  );
}
