"use client";

import { useState, useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  ReferenceArea,
} from "recharts";
import { Search, Target, X, Zap } from "lucide-react";
import type { Job } from "@/types";
import { useAppStore } from "@/store/useAppStore";
import { formatSalary } from "@/lib/utils";

// ─── Source color map ───────────────────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  adzuna: "#00E5FF",    // signal-cyan
  linkedin: "#9747FF",  // signal-violet
  indeed: "#F59E0B",    // amber
  manual: "#10B981",    // emerald/green
};

function getSourceColor(source: string): string {
  return SOURCE_COLORS[source] ?? "#6B7280"; // gray fallback
}

// ─── Freshness calc ─────────────────────────────────────────────

function getDaysOld(job: Job): number {
  const dateStr = job.posted_date ?? job.created_at;
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.min(Math.max(days, 0), 30);
}

// ─── Scatter dot shape ──────────────────────────────────────────

interface DotProps {
  cx?: number;
  cy?: number;
  payload?: Job & { daysOld: number };
  selectedJobId?: string | null;
  onHover?: (job: Job | null) => void;
  onClick?: (job: Job) => void;
}

function RadarDot({ cx = 0, cy = 0, payload, selectedJobId, onHover, onClick }: DotProps) {
  if (!payload) return null;

  const isSelected = selectedJobId === payload.id;
  const isHighScore = payload.match_score >= 70;
  const color = getSourceColor(payload.source);
  const r = isHighScore ? 11 : 8;

  return (
    <g
      style={{ cursor: "pointer" }}
      onMouseEnter={() => onHover?.(payload)}
      onMouseLeave={() => onHover?.(null)}
      onClick={() => onClick?.(payload)}
    >
      {isSelected && (
        <circle cx={cx} cy={cy} r={r + 6} fill={color} fillOpacity={0.15} stroke={color} strokeWidth={1.5} strokeOpacity={0.5} />
      )}
      {isHighScore && !isSelected && (
        <circle cx={cx} cy={cy} r={r + 4} fill="#10B981" fillOpacity={0.08} stroke="none" />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={color}
        fillOpacity={0.85}
        stroke={isSelected ? "#ffffff" : color}
        strokeWidth={isSelected ? 2 : 1}
        strokeOpacity={isSelected ? 1 : 0.4}
      />
    </g>
  );
}

// ─── Custom Tooltip ─────────────────────────────────────────────

interface TooltipPayloadItem {
  payload: Job & { daysOld: number };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const job = payload[0].payload;

  return (
    <div className="pointer-events-none z-50 max-w-[240px] rounded-xl border border-white/[0.12] bg-[#0a0f1a]/95 p-3 shadow-2xl backdrop-blur-md">
      <p className="text-xs font-semibold text-gray-100 truncate">{job.title}</p>
      <p className="text-xs text-gray-400 truncate">{job.company}</p>
      <div className="mt-2 flex items-center gap-3">
        <span className="text-xs font-bold" style={{ color: getSourceColor(job.source) }}>
          {job.match_score}% match
        </span>
        <span className="text-xs text-gray-500">{job.daysOld}d old</span>
      </div>
      {(job.salary_min || job.salary_max) && (
        <p className="mt-1 text-xs text-gray-400">{formatSalary(job.salary_min, job.salary_max)}</p>
      )}
      <p className="mt-1.5 text-[10px] text-gray-600 capitalize">{job.source}</p>
    </div>
  );
}

// ─── Top 5 list ─────────────────────────────────────────────────

interface TopMatchesProps {
  jobs: Job[];
  selectedJobId: string | null;
  onSelect: (id: string) => void;
}

function TopMatches({ jobs, selectedJobId, onSelect }: TopMatchesProps) {
  const top5 = useMemo(() =>
    [...jobs].sort((a, b) => b.match_score - a.match_score).slice(0, 5),
    [jobs]
  );

  if (!top5.length) return null;

  return (
    <div className="mt-4 space-y-1.5">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">Top Matches</p>
      {top5.map((job) => {
        const color = getSourceColor(job.source);
        const isSelected = selectedJobId === job.id;
        return (
          <button
            key={job.id}
            onClick={() => onSelect(job.id)}
            className={`w-full flex items-center gap-2 rounded-lg px-3 py-2 text-left transition-all ${
              isSelected
                ? "border border-white/10 bg-white/[0.06]"
                : "hover:bg-white/[0.04] border border-transparent"
            }`}
          >
            <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-medium text-gray-200">{job.title}</p>
              <p className="truncate text-[10px] text-gray-500">{job.company}</p>
            </div>
            <span className="flex-shrink-0 text-xs font-bold" style={{ color }}>
              {job.match_score}%
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── Legend ─────────────────────────────────────────────────────

const LEGEND_ITEMS = [
  { source: "adzuna", label: "Adzuna" },
  { source: "linkedin", label: "LinkedIn" },
  { source: "indeed", label: "Indeed" },
  { source: "manual", label: "Manual" },
];

function SourceLegend() {
  return (
    <div className="mt-4">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">Source Legend</p>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
        {LEGEND_ITEMS.map(({ source, label }) => (
          <div key={source} className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: getSourceColor(source) }} />
            <span className="text-xs text-gray-400">{label}</span>
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: "#6B7280" }} />
          <span className="text-xs text-gray-400">Other</span>
        </div>
      </div>
    </div>
  );
}

// ─── Stats bar ──────────────────────────────────────────────────

interface StatsBarProps {
  jobs: Job[];
  totalJobs: number;
}

function StatsBar({ jobs, totalJobs }: StatsBarProps) {
  const avgScore = jobs.length
    ? Math.round(jobs.reduce((s, j) => s + j.match_score, 0) / jobs.length)
    : 0;
  const highScore = jobs.length
    ? Math.max(...jobs.map((j) => j.match_score))
    : 0;

  const stats = [
    { label: "Total Jobs", value: totalJobs || jobs.length },
    { label: "Avg Score", value: `${avgScore}%` },
    { label: "Top Score", value: `${highScore}%` },
    { label: "Shown on Radar", value: jobs.length },
  ];

  return (
    <div className="mb-4 grid grid-cols-4 gap-3">
      {stats.map(({ label, value }) => (
        <div key={label} className="rounded-xl border border-white/[0.06] bg-signal-surface/60 px-3 py-2.5 text-center">
          <p className="text-lg font-bold text-gray-100">{value}</p>
          <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Main RadarView ─────────────────────────────────────────────

interface RadarViewProps {
  jobs: Job[];
  totalJobs: number;
  isLoading: boolean;
  onSelectJob: (id: string) => void;
}

export default function RadarView({ jobs, totalJobs, isLoading, onSelectJob }: RadarViewProps) {
  const { filters, setFilters, selectedJobId, isFetchingJobs } = useAppStore();
  const [hoveredJob, setHoveredJob] = useState<Job | null>(null);
  const [autoZoom, setAutoZoom] = useState(false);
  const [localSearch, setLocalSearch] = useState(filters.search ?? "");
  const [localMinScore, setLocalMinScore] = useState(filters.minScore ?? 0);

  // Prepare scatter data — each job gets a daysOld X value
  const plotData = useMemo(() => {
    let list = jobs.map((job) => ({ ...job, daysOld: getDaysOld(job) }));
    if (autoZoom) list = list.filter((j) => j.match_score > 60);
    return list;
  }, [jobs, autoZoom]);

  // Y-axis domain adjusts when auto-zoomed
  const yDomain: [number, number] = autoZoom ? [60, 100] : [0, 100];

  const handleSearch = (val: string) => {
    setLocalSearch(val);
    setFilters({ search: val || undefined });
  };

  const handleMinScore = (val: number) => {
    setLocalMinScore(val);
    setFilters({ minScore: val > 0 ? val : undefined });
  };

  const handleJobTypeChange = (val: string) => {
    setFilters({ jobType: val || undefined });
  };

  return (
    <div className="flex gap-6 min-h-[600px]">
      {/* ── Left: Plot area (65%) ── */}
      <div className="flex-[65] min-w-0 flex flex-col">

        {/* Stats bar */}
        <StatsBar jobs={plotData} totalJobs={totalJobs} />

        {/* Plot header + auto-zoom button */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="h-2 w-2 rounded-full bg-emerald-500/60" />
            <span>Score 70+ zone highlighted</span>
          </div>
          <button
            onClick={() => setAutoZoom((z) => !z)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${
              autoZoom
                ? "border-signal-cyan/40 bg-signal-cyan/10 text-signal-cyan"
                : "border-white/[0.08] bg-signal-surface text-gray-400 hover:text-gray-200"
            }`}
          >
            <Zap className="h-3.5 w-3.5" />
            {autoZoom ? "Showing Score > 60" : "Auto-zoom to High Matches"}
          </button>
        </div>

        {/* The Scatter chart */}
        {isLoading ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-white/[0.06] bg-signal-surface/40">
            <div className="flex flex-col items-center gap-3">
              <div className="h-10 w-10 rounded-full border-2 border-signal-cyan/30 border-t-signal-cyan animate-spin" />
              <p className="text-sm text-gray-500">Scanning radar…</p>
            </div>
          </div>
        ) : plotData.length === 0 ? (
          <div className="flex flex-1 items-center justify-center rounded-2xl border border-white/[0.06] bg-signal-surface/40 text-center">
            {isFetchingJobs ? (
              <div className="flex flex-col items-center gap-3">
                <div className="h-10 w-10 rounded-full border-2 border-signal-cyan/30 border-t-signal-cyan animate-spin" />
                <p className="text-sm text-gray-400">Fetching jobs — this may take a minute…</p>
              </div>
            ) : (
              <div>
                <Target className="mx-auto mb-3 h-10 w-10 text-gray-700" />
                <p className="text-sm text-gray-500">
                  {autoZoom ? "No jobs with score > 60 — try turning off Auto-zoom" : "No jobs on radar yet — fetch jobs to begin"}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 rounded-2xl border border-white/[0.06] bg-signal-surface/40 p-4 relative">
            {/* Hovered job quick label */}
            {hoveredJob && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                <div className="rounded-lg border border-white/[0.12] bg-[#0a0f1a]/90 px-3 py-1.5 text-xs text-gray-200 backdrop-blur">
                  {hoveredJob.title} @ {hoveredJob.company}
                </div>
              </div>
            )}

            <ResponsiveContainer width="100%" height={480}>
              <ScatterChart margin={{ top: 20, right: 30, bottom: 40, left: 40 }}>
                {/* Score 70+ glow zone */}
                <ReferenceArea
                  y1={70}
                  y2={yDomain[1]}
                  fill="#10B981"
                  fillOpacity={0.04}
                  stroke="#10B981"
                  strokeOpacity={0.15}
                  strokeWidth={1}
                />

                <XAxis
                  type="number"
                  dataKey="daysOld"
                  name="Days Old"
                  domain={[0, 30]}
                  tickCount={7}
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                  axisLine={{ stroke: "#ffffff10" }}
                  tickLine={false}
                  label={{
                    value: "Days Old →",
                    position: "insideBottom",
                    offset: -15,
                    fill: "#6B7280",
                    fontSize: 11,
                  }}
                />

                <YAxis
                  type="number"
                  dataKey="match_score"
                  name="Match Score"
                  domain={yDomain}
                  tickCount={6}
                  tick={{ fill: "#6B7280", fontSize: 11 }}
                  axisLine={{ stroke: "#ffffff10" }}
                  tickLine={false}
                  label={{
                    value: "Match Score →",
                    angle: -90,
                    position: "insideLeft",
                    offset: 15,
                    fill: "#6B7280",
                    fontSize: 11,
                  }}
                />

                {/* Score 70 reference line */}
                <ReferenceLine
                  y={70}
                  stroke="#10B981"
                  strokeOpacity={0.35}
                  strokeDasharray="4 4"
                  label={{ value: "70+", position: "right", fill: "#10B981", fontSize: 10 }}
                />

                {/* 15-day freshness guide */}
                <ReferenceLine
                  x={15}
                  stroke="#ffffff"
                  strokeOpacity={0.06}
                  strokeDasharray="3 3"
                />

                <Tooltip content={<CustomTooltip />} cursor={false} />

                <Scatter
                  data={plotData}
                  shape={(props: DotProps) => (
                    <RadarDot
                      {...props}
                      selectedJobId={selectedJobId}
                      onHover={setHoveredJob}
                      onClick={(job) => onSelectJob(job.id)}
                    />
                  )}
                >
                  {plotData.map((entry) => (
                    <Cell key={entry.id} fill={getSourceColor(entry.source)} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── Right: Sidebar (35%) ── */}
      <div className="flex-[35] min-w-0 flex flex-col gap-0">
        <div className="rounded-2xl border border-white/[0.06] bg-signal-surface/50 p-4 flex flex-col gap-4">

          {/* Filter: Search */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">Filters</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search title, company…"
                value={localSearch}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full rounded-xl border border-white/[0.08] bg-signal-bg/60 pl-9 pr-8 py-2 text-xs text-gray-200 placeholder-gray-600 focus:border-signal-cyan/40 focus:outline-none focus:ring-1 focus:ring-signal-cyan/20 transition-all"
              />
              {localSearch && (
                <button
                  onClick={() => handleSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>

          {/* Filter: Job Type */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5 block">
              Job Type
            </label>
            <select
              value={filters.jobType ?? ""}
              onChange={(e) => handleJobTypeChange(e.target.value)}
              className="w-full rounded-xl border border-white/[0.08] bg-signal-bg/60 px-3 py-2 text-xs text-gray-300 focus:border-signal-cyan/40 focus:outline-none cursor-pointer"
            >
              <option value="">All Types</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
              <option value="remote">Remote</option>
            </select>
          </div>

          {/* Filter: Min Score slider */}
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1.5 flex justify-between">
              <span>Min Score</span>
              <span className="text-signal-cyan font-bold">{localMinScore > 0 ? `${localMinScore}%` : "Any"}</span>
            </label>
            <input
              type="range"
              min={0}
              max={90}
              step={5}
              value={localMinScore}
              onChange={(e) => handleMinScore(Number(e.target.value))}
              className="w-full accent-signal-cyan"
            />
            <div className="mt-1 flex justify-between text-[10px] text-gray-600">
              <span>0%</span>
              <span>45%</span>
              <span>90%</span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-white/[0.06]" />

          {/* Top 5 matches */}
          <TopMatches jobs={jobs} selectedJobId={selectedJobId} onSelect={onSelectJob} />

          {/* Divider */}
          <div className="border-t border-white/[0.06]" />

          {/* Source Legend */}
          <SourceLegend />
        </div>
      </div>
    </div>
  );
}
