"use client";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import type { JobSortBy } from "@/types";

export default function JobFilters() {
  const { filters, setFilters, sortBy, setSortBy, resetFilters } = useAppStore();

  const hasActiveFilters = Object.values(filters).some(Boolean);

  const sortOptions: { value: JobSortBy; label: string }[] = [
    { value: "score", label: "Best Match" },
    { value: "newest", label: "Newest" },
    { value: "salary", label: "Highest Salary" },
    { value: "relevance", label: "Relevance" },
  ];

  return (
    <div className="space-y-3">
      {/* Search + Sort Row */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search jobs, companies, skills…"
            value={filters.search ?? ""}
            onChange={(e) => setFilters({ search: e.target.value || undefined })}
            className="w-full rounded-xl border border-white/[0.08] bg-signal-surface pl-10 pr-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:border-signal-cyan/40 focus:outline-none focus:ring-1 focus:ring-signal-cyan/20 transition-all"
          />
          {filters.search && (
            <button
              onClick={() => setFilters({ search: undefined })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as JobSortBy)}
          className="rounded-xl border border-white/[0.08] bg-signal-surface px-3 py-2.5 text-sm text-gray-300 focus:border-signal-cyan/40 focus:outline-none cursor-pointer"
        >
          {sortOptions.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-signal-surface">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs text-gray-500">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filter:
        </span>

        {[
          {
            key: "jobType",
            label: "Type",
            options: ["full-time", "part-time", "contract", "remote"],
          },
          {
            key: "seniority",
            label: "Level",
            options: ["intern", "junior", "mid", "senior", "lead", "staff"],
          },
          {
            key: "source",
            label: "Source",
            options: ["adzuna", "linkedin", "indeed", "manual"],
          },
        ].map(({ key, label, options }) => (
          <select
            key={key}
            value={(filters as Record<string, string | undefined>)[key] ?? ""}
            onChange={(e) =>
              setFilters({ [key]: e.target.value || undefined } as Record<string, string | undefined>)
            }
            className="rounded-lg border border-white/[0.08] bg-signal-surface px-3 py-1.5 text-xs text-gray-400 focus:border-signal-cyan/40 focus:outline-none cursor-pointer hover:border-white/[0.15] transition-colors"
          >
            <option value="" className="bg-signal-surface">
              {label}
            </option>
            {options.map((opt) => (
              <option key={opt} value={opt} className="bg-signal-surface capitalize">
                {opt}
              </option>
            ))}
          </select>
        ))}

        <select
          value={filters.datePosted ?? ""}
          onChange={(e) =>
            setFilters({ datePosted: (e.target.value as "24h" | "3d" | "7d" | "30d") || undefined })
          }
          className="rounded-lg border border-white/[0.08] bg-signal-surface px-3 py-1.5 text-xs text-gray-400 focus:border-signal-cyan/40 focus:outline-none cursor-pointer hover:border-white/[0.15] transition-colors"
        >
          <option value="">Date Posted</option>
          <option value="24h">Last 24h</option>
          <option value="3d">Last 3 days</option>
          <option value="7d">Last week</option>
          <option value="30d">Last month</option>
        </select>

        <select
          value={filters.minScore?.toString() ?? ""}
          onChange={(e) =>
            setFilters({ minScore: e.target.value ? Number(e.target.value) : undefined })
          }
          className="rounded-lg border border-white/[0.08] bg-signal-surface px-3 py-1.5 text-xs text-gray-400 focus:border-signal-cyan/40 focus:outline-none cursor-pointer hover:border-white/[0.15] transition-colors"
        >
          <option value="">Min Score</option>
          <option value="80">80%+ (Strong)</option>
          <option value="50">50%+ (Good)</option>
          <option value="25">25%+ (Partial)</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="flex items-center gap-1 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 transition-colors"
          >
            <X className="h-3 w-3" />
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}
