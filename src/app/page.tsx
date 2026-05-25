"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Briefcase, TrendingUp, Send, Users, Trophy,
  ChevronRight, Upload, BarChart3, RefreshCw,
  Zap, Clock, ArrowUpRight,
} from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import ResumeUpload from "@/components/resume/ResumeUpload";
import { ScoreBadge } from "@/components/ui/Badge";
import ApiErrorBanner from "@/components/ui/ApiErrorBanner";
import Spinner from "@/components/ui/Spinner";
import { useAppStore } from "@/store/useAppStore";
import { cn, formatSalary, formatRelativeDate } from "@/lib/utils";
import type { ApiErrorMessage } from "@/types";

interface DashboardData {
  totalJobs: number;
  avgMatchScore: number;
  applied: number;
  interviews: number;
  offers: number;
  newSinceLastVisit: number;
  topMatches: ReturnType<typeof useAppStore.getState>["jobs"];
  apiStatus: {
    anthropic: string;
    messages: ApiErrorMessage[];
  };
  lastFetch: string | null;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { profile, setProfile, setDashboardStats, isFetchingJobs } = useAppStore();

  useEffect(() => {
    // Load profile
    fetch("/api/resume")
      .then((r) => r.json())
      .then((d) => { if (d.profile) setProfile(d.profile); })
      .catch(() => {});

    // Load dashboard stats
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const statCards = data
    ? [
        {
          label: "Jobs Found",
          value: data.totalJobs,
          icon: Briefcase,
          color: "text-signal-cyan",
          bg: "bg-signal-cyan/10",
          badge: data.newSinceLastVisit > 0 ? `+${data.newSinceLastVisit} new` : undefined,
        },
        {
          label: "Avg Match Score",
          value: `${data.avgMatchScore}%`,
          icon: TrendingUp,
          color: "text-signal-violet",
          bg: "bg-signal-violet/10",
        },
        {
          label: "Applied",
          value: data.applied,
          icon: Send,
          color: "text-blue-400",
          bg: "bg-blue-400/10",
        },
        {
          label: "Interviews",
          value: data.interviews,
          icon: Users,
          color: "text-amber-400",
          bg: "bg-amber-400/10",
        },
        {
          label: "Offers",
          value: data.offers,
          icon: Trophy,
          color: "text-emerald-400",
          bg: "bg-emerald-400/10",
        },
      ]
    : [];

  return (
    <div className="min-h-screen bg-signal-bg bg-signal-gradient">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-6">

        {/* API Error Banners */}
        {data?.apiStatus?.messages && data.apiStatus.messages.length > 0 && (
          <ApiErrorBanner messages={data.apiStatus.messages} />
        )}

        {!profile ? (
          /* ── No Profile → Welcome Screen ── */
          <div className="flex flex-col items-center justify-center min-h-[70vh] max-w-2xl mx-auto text-center">
            {/* Radar animation */}
            <div className="relative mb-8">
              <div className="h-32 w-32 rounded-full border border-signal-cyan/20 flex items-center justify-center">
                <div className="h-24 w-24 rounded-full border border-signal-cyan/15 flex items-center justify-center">
                  <div className="h-16 w-16 rounded-full border border-signal-cyan/10 flex items-center justify-center">
                    <div className="radar-icon h-10 w-10 rounded-full bg-signal-surface flex items-center justify-center">
                      <div className="h-3 w-3 rounded-full bg-signal-cyan shadow-[0_0_12px_rgba(6,182,212,0.9)]" />
                    </div>
                  </div>
                </div>
              </div>
              {/* Sweep */}
              <div className="absolute inset-0 rounded-full" style={{
                background: "conic-gradient(from 0deg, transparent 70%, rgba(6,182,212,0.2) 100%)",
                animation: "radar-sweep 3s linear infinite",
              }} />
            </div>

            <h1 className="text-4xl font-bold tracking-tight text-gray-100 mb-3">
              Welcome to{" "}
              <span className="gradient-text">JobRadar</span>
            </h1>
            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
              Upload your resume and let AI find, rank, and match the best jobs for you — automatically.
            </p>

            <div className="w-full max-w-md">
              <ResumeUpload onSuccess={() => window.location.reload()} />
            </div>

            <div className="mt-8 grid grid-cols-3 gap-4 text-center max-w-sm">
              {[
                { icon: "🎯", label: "AI Match Scoring" },
                { icon: "⚡", label: "Auto Job Fetch" },
                { icon: "📋", label: "Pipeline Tracker" },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-white/[0.06] bg-signal-surface/50 p-3">
                  <div className="text-xl mb-1">{item.icon}</div>
                  <p className="text-xs text-gray-500">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* ── Dashboard ── */
          <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-100">
                  Good day 👋
                </h1>
                <p className="mt-1 text-gray-500 text-sm">
                  {data?.newSinceLastVisit
                    ? `${data.newSinceLastVisit} new jobs since your last visit`
                    : data?.lastFetch
                    ? `Last updated ${formatRelativeDate(data.lastFetch)}`
                    : "Your personalized job feed"}
                </p>
              </div>
              <Link
                href="/jobs"
                className="flex items-center gap-2 rounded-xl border border-signal-cyan/20 bg-signal-cyan/10 px-4 py-2.5 text-sm font-medium text-signal-cyan hover:bg-signal-cyan/20 transition-all"
              >
                <Briefcase className="h-4 w-4" />
                View All Jobs
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Stats */}
            {isLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-24 rounded-2xl shimmer" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                {statCards.map((card) => {
                  const Icon = card.icon;
                  return (
                    <div key={card.label} className="glass-card p-4 animate-fade-up">
                      <div className={cn("mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl", card.bg)}>
                        <Icon className={cn("h-4 w-4", card.color)} />
                      </div>
                      <div className="flex items-end justify-between">
                        <div>
                          <p className="text-2xl font-bold text-gray-100 font-mono">{card.value}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                        </div>
                        {card.badge && (
                          <span className="text-[10px] font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-2 py-0.5">
                            {card.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Top Matches */}
              <div className="lg:col-span-2">
                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-signal-cyan" />
                    <h2 className="text-base font-semibold text-gray-200">Top Matches Today</h2>
                  </div>
                  <Link href="/jobs?sort=score" className="text-xs text-signal-cyan hover:underline">
                    View all →
                  </Link>
                </div>
                <div className="space-y-3">
                  {isLoading ? (
                    [...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-xl shimmer" />)
                  ) : data?.topMatches?.length ? (
                    data.topMatches.map((job) => (
                      <Link key={job.id} href={`/jobs?highlight=${job.id}`}>
                        <div className="glass-card p-4 cursor-pointer hover:shadow-card-hover">
                          <div className="flex items-start gap-3">
                            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-signal-cyan/20 to-signal-violet/20 border border-white/[0.08] text-sm font-bold text-gray-300 uppercase">
                              {job.company?.slice(0, 2)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-medium text-gray-200 text-sm truncate">{job.title}</p>
                                  <p className="text-xs text-gray-500 mt-0.5">{job.company} · {job.location ?? "Remote"}</p>
                                </div>
                                <ScoreBadge score={job.matchScore} />
                              </div>
                              {job.salaryMin || job.salaryMax ? (
                                <p className="mt-1.5 text-xs text-gray-600">
                                  💰 {formatSalary(job.salaryMin, job.salaryMax)}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-xl border border-dashed border-white/[0.08] p-8 text-center">
                      <p className="text-sm text-gray-500">No jobs found yet.</p>
                      <p className="mt-1 text-xs text-gray-600">Click "Refresh" in the nav to fetch jobs.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Profile Panel + Quick Actions */}
              <div className="space-y-4">
                {/* Profile Card */}
                <div className="glass-card p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-300">Your Profile</h3>
                    <Link href="/profile" className="text-xs text-signal-cyan hover:underline">Edit</Link>
                  </div>
                  {profile ? (
                    <div className="space-y-2">
                      {profile.desiredRole && (
                        <p className="text-sm text-gray-200 font-medium">{profile.desiredRole}</p>
                      )}
                      {profile.location && (
                        <p className="text-xs text-gray-500">📍 {profile.location}</p>
                      )}
                      <p className="text-xs text-gray-500">⏱ {profile.experienceYears}y experience</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {profile.skills.slice(0, 6).map((s: string) => (
                          <span key={s} className="rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 text-[11px] text-gray-500">
                            {s}
                          </span>
                        ))}
                        {profile.skills.length > 6 && (
                          <span className="text-[11px] text-gray-600">+{profile.skills.length - 6} more</span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">No profile loaded</p>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="glass-card p-4">
                  <h3 className="mb-3 text-sm font-semibold text-gray-300">Quick Actions</h3>
                  <div className="space-y-2">
                    {[
                      { href: "/jobs", label: "Browse Jobs", icon: Briefcase, color: "text-signal-cyan" },
                      { href: "/pipeline", label: "View Pipeline", icon: BarChart3, color: "text-signal-violet" },
                      { href: "/profile", label: "Update Resume", icon: Upload, color: "text-gray-400" },
                    ].map(({ href, label, icon: Icon, color }) => (
                      <Link
                        key={href}
                        href={href}
                        className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-gray-400 hover:bg-white/[0.04] hover:text-gray-200 transition-all"
                      >
                        <Icon className={cn("h-4 w-4 flex-shrink-0", color)} />
                        {label}
                        <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-40" />
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
