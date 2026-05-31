"use client";
import { useCallback, useEffect } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { JobFilters } from "@/types";

interface UseJobsReturn {
  jobs: ReturnType<typeof useAppStore.getState>["jobs"];
  totalJobs: number;
  currentPage: number;
  totalPages: number;
  isLoading: boolean;
  loadPage: (page: number) => Promise<void>;
  reload: () => Promise<void>;
}

export function useJobs(overrideFilters?: Partial<JobFilters>): UseJobsReturn {
  const {
    jobs, totalJobs, currentPage, totalPages,
    setJobs, isLoadingJobs, setLoadingJobs,
    filters: storeFilters, sortBy,
  } = useAppStore();

  const filters = { ...storeFilters, ...overrideFilters };

  const loadPage = useCallback(
    async (page = 1) => {
      setLoadingJobs(true);
      try {
        const params = new URLSearchParams({
          page: String(page),
          sortBy,
          pageSize: "20",
        });
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(filters), sortBy, setJobs, setLoadingJobs]
  );

  useEffect(() => {
    loadPage(1);
  }, [JSON.stringify(filters), sortBy]);

  // Listen for external refresh events (e.g. after job fetch)
  useEffect(() => {
    const handler = () => loadPage(1);
    window.addEventListener("jobs-refreshed", handler);
    return () => window.removeEventListener("jobs-refreshed", handler);
  }, [loadPage]);

  return {
    jobs,
    totalJobs,
    currentPage,
    totalPages,
    isLoading: isLoadingJobs,
    loadPage,
    reload: () => loadPage(1),
  };
}
