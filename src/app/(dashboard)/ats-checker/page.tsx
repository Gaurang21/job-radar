"use client";
import { useEffect, useState } from "react";
import {
  FileText, ClipboardList, Sparkles, Loader2,
  CheckCircle, XCircle, AlertTriangle, ChevronDown, ChevronUp,
  RotateCcw, Copy, Upload,
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { useProfile } from "@/hooks/useProfile";
import ResumeUpload from "@/components/resume/ResumeUpload";
import type { ATSScore } from "@/types";
import toast from "react-hot-toast";

type ResumeMode = "stored" | "paste" | "upload";

const SCORE_COLOR = (s: number) =>
  s >= 80 ? "text-emerald-400" : s >= 60 ? "text-amber-400" : "text-red-400";

const SCORE_BG = (s: number) =>
  s >= 80 ? "bg-emerald-500" : s >= 60 ? "bg-amber-500" : "bg-red-500";

const SCORE_RING = (s: number) =>
  s >= 80 ? "stroke-emerald-400" : s >= 60 ? "stroke-amber-400" : "stroke-red-400";

const PRIORITY_STYLES = {
  high: "border-red-500/30 bg-red-500/10 text-red-300",
  medium: "border-amber-500/30 bg-amber-500/10 text-amber-300",
  low: "border-blue-500/30 bg-blue-500/10 text-blue-300",
};

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const filled = (score / 100) * circ;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={10} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          className={`${SCORE_RING(score)} transition-all duration-700`}
          strokeWidth={10}
          strokeDasharray={`${filled} ${circ - filled}`}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-3xl font-bold tabular-nums ${SCORE_COLOR(score)}`}>{score}</span>
        <span className="text-xs text-gray-500">/ 100</span>
      </div>
    </div>
  );
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-gray-400">{label}</span>
        <span className={`font-medium tabular-nums ${SCORE_COLOR(score)}`}>{score}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full transition-all duration-700 ${SCORE_BG(score)}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export default function ATSCheckerPage() {
  const { profile, isLoading: isLoadingProfile } = useProfile();
  const [resumeMode, setResumeMode] = useState<ResumeMode>("stored");
  const [pastedResume, setPastedResume] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<ATSScore | null>(null);
  const [openSection, setOpenSection] = useState<string | null>("suggestions");

  // Default to paste mode if no stored resume
  useEffect(() => {
    if (!isLoadingProfile && !profile) setResumeMode("paste");
  }, [isLoadingProfile, profile]);

  const handleAnalyze = async () => {
    if (!jobDescription.trim()) {
      toast.error("Please paste a job description");
      return;
    }
    if (resumeMode === "paste" && !pastedResume.trim()) {
      toast.error("Please paste your resume text");
      return;
    }

    setIsAnalyzing(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/ats-score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobDescription,
          useStoredResume: resumeMode === "stored",
          resumeText: resumeMode === "paste" ? pastedResume : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Analysis failed");
        return;
      }
      setResult(data.result);
      setOpenSection("suggestions");
    } catch {
      toast.error("Failed to analyze — please try again");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setJobDescription("");
    setPastedResume("");
  };

  const toggle = (section: string) =>
    setOpenSection((prev) => (prev === section ? null : section));

  return (
    <main className="w-full px-4 pb-16 pt-24 md:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-100">
          <FileText className="h-6 w-6 text-signal-cyan" />
          ATS Score Checker
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          See how your resume performs against an ATS for a specific job — and get exact fixes to score higher.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Left: Inputs ── */}
        <div className="space-y-5">
          {/* Resume section */}
          <div className="glass-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-300">
                Your Resume
              </h2>
              <div className="flex gap-1 rounded-lg border border-white/[0.08] p-1">
                {([
                  { id: "stored", label: "Use saved" },
                  { id: "paste",  label: "Paste" },
                  { id: "upload", label: "Upload" },
                ] as { id: ResumeMode; label: string }[]).map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setResumeMode(id)}
                    disabled={id === "stored" && !profile}
                    className={`rounded-md px-3 py-1 text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      resumeMode === id
                        ? "bg-signal-cyan text-signal-bg"
                        : "text-gray-400 hover:text-gray-200"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {isLoadingProfile ? (
              <div className="flex items-center gap-2 py-4">
                <Spinner size="sm" />
                <span className="text-sm text-gray-500">Loading saved resume…</span>
              </div>
            ) : resumeMode === "stored" && profile ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-emerald-300">Saved resume loaded</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.slice(0, 8).map((s) => (
                    <span key={s} className="rounded-md bg-white/[0.06] px-2 py-0.5 text-xs text-gray-400">
                      {s}
                    </span>
                  ))}
                  {profile.skills.length > 8 && (
                    <span className="text-xs text-gray-600">+{profile.skills.length - 8} more</span>
                  )}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  {profile.experienceYears} years exp · {profile.titles[0] ?? "Engineer"}
                </p>
              </div>
            ) : resumeMode === "upload" ? (
              <ResumeUpload
                compact
                onSuccess={() => setResumeMode("stored")}
              />
            ) : (
              <textarea
                value={pastedResume}
                onChange={(e) => setPastedResume(e.target.value)}
                placeholder="Paste your complete resume text here (plain text works best — no formatting needed)…"
                rows={10}
                className="w-full resize-none rounded-xl border border-white/[0.08] bg-signal-bg/50 px-4 py-3 text-sm text-gray-200 placeholder-gray-600 leading-relaxed focus:border-signal-cyan/40 focus:outline-none"
              />
            )}
          </div>

          {/* Job description */}
          <div className="glass-card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-300">
              Job Description
            </h2>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the full job description here — include requirements, responsibilities, and preferred qualifications…"
              rows={12}
              className="w-full resize-none rounded-xl border border-white/[0.08] bg-signal-bg/50 px-4 py-3 text-sm text-gray-200 placeholder-gray-600 leading-relaxed focus:border-signal-cyan/40 focus:outline-none"
            />
            <p className="mt-2 text-xs text-gray-600">
              {jobDescription.length > 0 && `${jobDescription.split(/\s+/).filter(Boolean).length} words`}
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing || !jobDescription.trim() || (resumeMode === "paste" && !pastedResume.trim())}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-signal-cyan py-3 text-sm font-semibold text-signal-bg hover:bg-signal-cyan/90 transition-all disabled:opacity-50"
            >
              {isAnalyzing ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</>
              ) : (
                <><Sparkles className="h-4 w-4" /> Check ATS Score</>
              )}
            </button>
            {result && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-signal-surface px-4 py-3 text-sm text-gray-400 hover:text-gray-200 transition-all"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* ── Right: Results ── */}
        <div>
          {isAnalyzing && (
            <div className="glass-card p-10 text-center">
              <Loader2 className="mx-auto mb-4 h-10 w-10 animate-spin text-signal-cyan" />
              <p className="text-sm font-medium text-gray-300">Analyzing ATS compatibility…</p>
              <p className="mt-1 text-xs text-gray-600">This takes 10–20 seconds</p>
            </div>
          )}

          {!isAnalyzing && !result && (
            <div className="glass-card flex flex-col items-center justify-center p-12 text-center opacity-50">
              <ClipboardList className="mb-4 h-12 w-12 text-gray-600" />
              <p className="text-sm text-gray-400">Your ATS score will appear here</p>
            </div>
          )}

          {result && !isAnalyzing && (
            <div className="space-y-4">
              {/* Overall Score */}
              <div className="glass-card p-6">
                <div className="flex items-center gap-6">
                  <ScoreRing score={result.overallScore} size={120} />
                  <div className="flex-1 space-y-3">
                    <ScoreBar label="Keyword Match" score={result.keywordScore} />
                    <ScoreBar label="Skills Alignment" score={result.skillsScore} />
                    <ScoreBar label="Experience Match" score={result.experienceScore} />
                    <ScoreBar label="Format / Structure" score={result.formatScore} />
                  </div>
                </div>
                {result.summary && (
                  <p className="mt-4 text-sm leading-relaxed text-gray-400 border-t border-white/[0.06] pt-4">
                    {result.summary}
                  </p>
                )}
              </div>

              {/* Keywords */}
              <div className="glass-card overflow-hidden">
                <button
                  onClick={() => toggle("keywords")}
                  className="flex w-full items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-gray-200">
                      Keywords ({result.matchedKeywords.length} matched · {result.missingKeywords.length} missing)
                    </span>
                  </div>
                  {openSection === "keywords" ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                </button>
                {openSection === "keywords" && (
                  <div className="border-t border-white/[0.06] p-5 space-y-4">
                    {result.matchedKeywords.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-medium text-gray-500">✓ Found in resume</p>
                        <div className="flex flex-wrap gap-1.5">
                          {result.matchedKeywords.map((kw) => (
                            <span key={kw} className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs text-emerald-300">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {result.missingKeywords.length > 0 && (
                      <div>
                        <p className="mb-2 text-xs font-medium text-gray-500">✗ Missing from resume</p>
                        <div className="flex flex-wrap gap-1.5">
                          {result.missingKeywords.map((kw) => (
                            <span key={kw} className="rounded-md border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs text-red-300">
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Suggestions */}
              <div className="glass-card overflow-hidden">
                <button
                  onClick={() => toggle("suggestions")}
                  className="flex w-full items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400" />
                    <span className="text-sm font-semibold text-gray-200">
                      Improvements ({result.suggestions.length})
                    </span>
                  </div>
                  {openSection === "suggestions" ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                </button>
                {openSection === "suggestions" && (
                  <div className="border-t border-white/[0.06] p-5 space-y-2">
                    {result.suggestions
                      .sort((a, b) => ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]))
                      .map((s, i) => (
                        <div key={i} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${PRIORITY_STYLES[s.priority]}`}>
                          <span className="mt-0.5 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border border-current/30 flex-shrink-0">
                            {s.priority}
                          </span>
                          <p className="text-sm leading-relaxed">{s.text}</p>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              {/* Section Breakdown */}
              <div className="glass-card overflow-hidden">
                <button
                  onClick={() => toggle("sections")}
                  className="flex w-full items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-signal-violet" />
                    <span className="text-sm font-semibold text-gray-200">Section Breakdown</span>
                  </div>
                  {openSection === "sections" ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
                </button>
                {openSection === "sections" && (
                  <div className="border-t border-white/[0.06] p-5 space-y-4">
                    {result.sectionScores.map((sec) => (
                      <div key={sec.section}>
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-300">{sec.section}</span>
                          <span className={`text-sm font-bold tabular-nums ${SCORE_COLOR(sec.score)}`}>{sec.score}</span>
                        </div>
                        <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                          <div className={`h-full rounded-full transition-all duration-700 ${SCORE_BG(sec.score)}`} style={{ width: `${sec.score}%` }} />
                        </div>
                        <p className="text-xs text-gray-500">{sec.feedback}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Copy missing keywords */}
              {result.missingKeywords.length > 0 && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(result.missingKeywords.join(", "));
                    toast.success("Missing keywords copied!");
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.08] bg-signal-surface py-2.5 text-sm text-gray-400 hover:text-gray-200 transition-all"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy missing keywords
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
