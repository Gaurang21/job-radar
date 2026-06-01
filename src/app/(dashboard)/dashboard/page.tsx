"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase, TrendingUp, Send, MessageSquare, Trophy,
  XCircle, Sparkles, RefreshCw, AlertTriangle, Brain,
  ArrowRight, ChevronDown, ChevronUp, Upload, Zap, KanbanSquare,
} from "lucide-react";
import JobCard from "@/components/jobs/JobCard";
import JobDrawer from "@/components/jobs/JobDrawer";
import CoverLetterModal from "@/components/cover-letter/CoverLetterModal";
import InterviewPrepModal from "@/components/ai/InterviewPrepModal";
import EmailDraftModal from "@/components/ai/EmailDraftModal";
import Spinner from "@/components/ui/Spinner";
import { useAppStore } from "@/store/useAppStore";
import type { Job, MarketPulse, RejectionPattern } from "@/types";

interface DashboardStats {
  totalJobs: number;
  avgMatchScore: number;
  applied: number;
  interviews: number;
  offers: number;
  rejected: number;
  offerRate: number;
  newSinceLastVisit: number;
  topMatches: Job[];
  lastFetch: string | null;
  unreadNotifications: number;
  hasProfile: boolean;
  apiStatus: { messages: Array<{ service: string; message: string; severity: string }> };
}

export default function DashboardPage() {
  const { setSelectedJobId, selectedJobId } = useAppStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [coverLetterJob, setCoverLetterJob] = useState<Job | null>(null);
  const [interviewPrepJob, setInterviewPrepJob] = useState<Job | null>(null);
  const [emailDraftJob, setEmailDraftJob] = useState<Job | null>(null);

  // Market Pulse
  const [marketPulse, setMarketPulse] = useState<MarketPulse | null>(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [showMarket, setShowMarket] = useState(false);

  // Rejection Analysis
  const [rejections, setRejections] = useState<RejectionPattern | null>(null);
  const [isLoadingRejections, setIsLoadingRejections] = useState(false);
  const [showRejections, setShowRejections] = useState(false);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setStats(d))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const loadMarketPulse = async () => {
    if (marketPulse || isLoadingMarket) { setShowMarket((v) => !v); return; }
    setIsLoadingMarket(true);
    setShowMarket(true);
    setMarketError(null);
    try {
      const res = await fetch("/api/ai/market-pulse", { method: "POST" });
      const data = await res.json();
      if (!res.ok) setMarketError(data.error || "Failed to load market pulse");
      else setMarketPulse(data.pulse);
    } catch {
      setMarketError("Failed to load market pulse");
    } finally {
      setIsLoadingMarket(false);
    }
  };

  const loadRejectionAnalysis = async () => {
    if (rejections || isLoadingRejections) { setShowRejections((v) => !v); return; }
    setIsLoadingRejections(true);
    setShowRejections(true);
    try {
      const res = await fetch("/api/ai/rejection-analysis");
      const data = await res.json();
      if (res.ok) setRejections(data.analysis);
    } catch {
      // silent fail
    } finally {
      setIsLoadingRejections(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex items-center justify-center min-h-[70vh]">
        <Spinner size="lg" />
      </main>
    );
  }

  const statCards = [
    { label: "Jobs Found", value: stats?.totalJobs ?? 0, icon: Briefcase, color: "text-signal-cyan" },
    { label: "Avg Match Score", value: `${stats?.avgMatchScore ?? 0}%`, icon: TrendingUp, color: "text-signal-violet" },
    { label: "Applied", value: stats?.applied ?? 0, icon: Send, color: "text-blue-400" },
    { label: "Interviews", value: stats?.interviews ?? 0, icon: MessageSquare, color: "text-amber-400" },
    { label: "Offers", value: stats?.offers ?? 0, icon: Trophy, color: "text-emerald-400" },
    { label: "Rejected", value: stats?.rejected ?? 0, icon: XCircle, color: "text-red-400" },
  ];

  return (
    <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 md:px-6">
      {/* Welcome header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          {stats?.newSinceLastVisit
            ? `${stats.newSinceLastVisit} new jobs since your last visit`
            : stats?.lastFetch
            ? `Last updated ${new Date(stats.lastFetch).toLocaleDateString()}`
            : "No jobs fetched yet — use Refresh to get started"}
        </p>
      </div>

      {/* Onboarding banner — shown until user uploads a resume */}
      {stats && !stats.hasProfile && (
        <div className="mb-8 rounded-2xl border border-signal-cyan/20 bg-gradient-to-br from-signal-cyan/5 to-signal-violet/5 p-6">
          <h2 className="text-base font-semibold text-gray-100 mb-1">Welcome to JobRadar! Let&apos;s get you set up.</h2>
          <p className="text-sm text-gray-400 mb-5">Follow these three steps to start getting AI-ranked job matches tailored to your resume.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              {
                step: 1,
                icon: Upload,
                title: "Upload your resume",
                desc: "PDF or DOCX — Claude will extract your skills, experience, and goals.",
                href: "/profile",
                color: "text-signal-cyan",
                border: "border-signal-cyan/20",
                bg: "bg-signal-cyan/10",
              },
              {
                step: 2,
                icon: Zap,
                title: "Fetch job matches",
                desc: "Hit Refresh to pull jobs from LinkedIn, Indeed, and Adzuna — auto-scored against your profile.",
                href: null,
                color: "text-signal-violet",
                border: "border-signal-violet/20",
                bg: "bg-signal-violet/10",
              },
              {
                step: 3,
                icon: KanbanSquare,
                title: "Track your pipeline",
                desc: "Move applications through stages: Applied → Interview → Offer.",
                href: "/pipeline",
                color: "text-emerald-400",
                border: "border-emerald-500/20",
                bg: "bg-emerald-500/10",
              },
            ].map(({ step, icon: Icon, title, desc, href, color, border, bg }) => (
              <div key={step} className={`rounded-xl border ${border} ${bg} p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-gray-500">STEP {step}</span>
                </div>
                <Icon className={`h-5 w-5 mb-2 ${color}`} />
                <p className="text-sm font-semibold text-gray-200 mb-1">{title}</p>
                <p className="text-xs text-gray-500 mb-3">{desc}</p>
                {href && (
                  <Link href={href} className={`inline-flex items-center gap-1 text-xs font-medium ${color} hover:opacity-80 transition-opacity`}>
                    Get started <ArrowRight className="h-3 w-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API status warnings */}
      {(stats?.apiStatus.messages?.length ?? 0) > 0 && (
        <div className="mb-6 space-y-2">
          {stats!.apiStatus.messages.map((msg) => (
            <div key={msg.service} className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-400" />
              <p className="text-sm text-amber-300/90">{msg.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="glass-card p-4 text-center">
              <Icon className={`mx-auto mb-2 h-5 w-5 ${card.color}`} />
              <p className="text-xl font-bold text-gray-100">{card.value}</p>
              <p className="text-[11px] text-gray-500 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Top Matches */}
      {(stats?.topMatches?.length ?? 0) > 0 && (
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-200 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-signal-violet" />
              Top Matches
            </h2>
            <Link href="/jobs" className="flex items-center gap-1 text-xs text-signal-cyan hover:text-signal-cyan/80 transition-colors">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {stats!.topMatches.map((job, i) => (
              <JobCard
                key={job.id}
                job={job}
                index={i}
                onClick={() => setSelectedJobId(job.id)}
                onCoverLetter={() => setCoverLetterJob(job)}
              />
            ))}
          </div>
        </div>
      )}

      {/* AI Insight Widgets */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Market Pulse */}
        <div className="glass-card overflow-hidden">
          <button
            onClick={loadMarketPulse}
            className="flex w-full items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-signal-violet/20">
                <Brain className="h-4 w-4 text-signal-violet" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-200">Market Pulse</p>
                <p className="text-xs text-gray-500">AI summary of your job market</p>
              </div>
            </div>
            {isLoadingMarket ? (
              <RefreshCw className="h-4 w-4 animate-spin text-signal-violet" />
            ) : showMarket ? (
              <ChevronUp className="h-4 w-4 text-gray-500" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500" />
            )}
          </button>
          {showMarket && (
            <div className="border-t border-white/[0.06] p-5">
              {isLoadingMarket ? (
                <div className="flex items-center gap-3 py-4">
                  <Spinner size="sm" />
                  <p className="text-sm text-gray-400">Analyzing market trends…</p>
                </div>
              ) : marketError ? (
                <p className="text-sm text-red-400">{marketError}</p>
              ) : marketPulse ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-300 leading-relaxed">{marketPulse.summary}</p>
                  {marketPulse.hotSkills?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Hot Skills</p>
                      <div className="flex flex-wrap gap-1.5">
                        {marketPulse.hotSkills.map((skill) => (
                          <span key={skill} className="rounded-md border border-signal-cyan/20 bg-signal-cyan/10 px-2 py-0.5 text-xs text-signal-cyan">
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {marketPulse.salaryRange && (
                    <p className="text-xs text-gray-500">
                      Salary range: <span className="text-gray-300">{marketPulse.salaryRange}</span>
                    </p>
                  )}
                  {marketPulse.insight && (
                    <p className="text-xs text-signal-violet/80 italic">{marketPulse.insight}</p>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Rejection Pattern Analyzer */}
        <div className="glass-card overflow-hidden">
          <button
            onClick={stats?.rejected && stats.rejected >= 3 ? loadRejectionAnalysis : undefined}
            className={`flex w-full items-center justify-between p-5 text-left transition-colors ${
              (stats?.rejected ?? 0) >= 3 ? "hover:bg-white/[0.02] cursor-pointer" : "cursor-default opacity-60"
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-500/20">
                <XCircle className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-200">Rejection Analyzer</p>
                <p className="text-xs text-gray-500">
                  {(stats?.rejected ?? 0) < 3
                    ? `Need ${3 - (stats?.rejected ?? 0)} more rejections to unlock`
                    : `Patterns from ${stats!.rejected} rejections`}
                </p>
              </div>
            </div>
            {(stats?.rejected ?? 0) >= 3 && (
              isLoadingRejections ? (
                <RefreshCw className="h-4 w-4 animate-spin text-red-400" />
              ) : showRejections ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )
            )}
          </button>
          {showRejections && (
            <div className="border-t border-white/[0.06] p-5">
              {isLoadingRejections ? (
                <div className="flex items-center gap-3 py-4">
                  <Spinner size="sm" />
                  <p className="text-sm text-gray-400">Analyzing rejection patterns…</p>
                </div>
              ) : rejections ? (
                <div className="space-y-3">
                  {rejections.patterns?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Common Patterns</p>
                      <ul className="space-y-1">
                        {rejections.patterns.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {rejections.recommendations?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-1.5">Recommendations</p>
                      <ul className="space-y-1">
                        {rejections.recommendations.map((r, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-emerald-400/90">
                            <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {rejections.overallInsight && (
                    <p className="text-xs text-gray-500 italic">{rejections.overallInsight}</p>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { href: "/jobs", label: "Browse Jobs", icon: Briefcase, color: "text-signal-cyan" },
          { href: "/pipeline", label: "My Pipeline", icon: Send, color: "text-signal-violet" },
          { href: "/profile", label: "My Profile", icon: TrendingUp, color: "text-blue-400" },
          { href: "/settings/ai", label: "AI Settings", icon: Sparkles, color: "text-emerald-400" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="glass-card flex items-center gap-3 p-4 hover:bg-white/[0.04] transition-colors"
            >
              <Icon className={`h-5 w-5 ${item.color}`} />
              <span className="text-sm text-gray-300">{item.label}</span>
              <ArrowRight className="ml-auto h-4 w-4 text-gray-600" />
            </Link>
          );
        })}
      </div>

      {/* Modals */}
      <JobDrawer
        jobId={selectedJobId}
        onClose={() => setSelectedJobId(null)}
        onCoverLetter={(job) => { setSelectedJobId(null); setCoverLetterJob(job); }}
        onInterviewPrep={(job) => { setSelectedJobId(null); setInterviewPrepJob(job); }}
        onEmailDraft={(job) => { setSelectedJobId(null); setEmailDraftJob(job); }}
      />
      <CoverLetterModal job={coverLetterJob} onClose={() => setCoverLetterJob(null)} />
      <InterviewPrepModal job={interviewPrepJob} onClose={() => setInterviewPrepJob(null)} />
      <EmailDraftModal job={emailDraftJob} onClose={() => setEmailDraftJob(null)} />
    </main>
  );
}
