"use client";
import { useState } from "react";
import {
  Linkedin, Sparkles, Loader2, ChevronDown, ChevronUp,
  CheckCircle, AlertTriangle, ArrowRight,
} from "lucide-react";
import toast from "react-hot-toast";
import type { LinkedInAnalysis } from "@/types";

const SECTION_SCORE_COLORS = (score: number) => {
  if (score >= 80) return "text-emerald-400";
  if (score >= 60) return "text-amber-400";
  return "text-red-400";
};

export default function LinkedInAnalyzerPage() {
  const [about, setAbout] = useState("");
  const [experience, setExperience] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<LinkedInAnalysis | null>(null);
  const [openSection, setOpenSection] = useState<string | null>("strengths");

  const handleAnalyze = async () => {
    if (!about.trim()) {
      toast.error("Please paste your LinkedIn About section");
      return;
    }
    setIsLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/ai/linkedin-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ about, experience }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to analyze");
        return;
      }
      setResult(data.analysis);
      setOpenSection("strengths");
    } catch {
      toast.error("Failed to analyze LinkedIn profile");
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSection = (section: string) => {
    setOpenSection((prev) => (prev === section ? null : section));
  };

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-24 md:px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <Linkedin className="h-6 w-6 text-blue-400" />
          LinkedIn Profile Analyzer
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Paste your LinkedIn sections and get AI-powered optimization recommendations
        </p>
      </div>

      {/* Input Form */}
      <div className="glass-card p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              About / Summary Section
              <span className="ml-1 text-red-400">*</span>
            </label>
            <textarea
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Paste your LinkedIn About section here…"
              rows={6}
              className="w-full rounded-xl border border-white/[0.08] bg-signal-bg/50 px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:border-signal-cyan/40 focus:outline-none resize-none leading-relaxed"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Experience Highlights
              <span className="ml-1.5 text-xs text-gray-500">(optional)</span>
            </label>
            <textarea
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              placeholder="Paste notable experience descriptions, achievements, or role summaries…"
              rows={5}
              className="w-full rounded-xl border border-white/[0.08] bg-signal-bg/50 px-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:border-signal-cyan/40 focus:outline-none resize-none leading-relaxed"
            />
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleAnalyze}
            disabled={isLoading || !about.trim()}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {isLoading ? "Analyzing…" : "Analyze Profile"}
          </button>
          {result && (
            <button
              onClick={() => { setResult(null); setAbout(""); setExperience(""); }}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {isLoading && (
        <div className="glass-card p-10 text-center">
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-blue-400" />
          <p className="text-sm text-gray-400">Analyzing your LinkedIn profile with AI…</p>
          <p className="mt-1 text-xs text-gray-600">This may take 10–15 seconds</p>
        </div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Score Overview */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-200">Profile Score</h2>
              {result.overallScore != null && (
                <div className="flex items-center gap-2">
                  <div className={`text-3xl font-bold ${SECTION_SCORE_COLORS(result.overallScore)}`}>
                    {result.overallScore}
                  </div>
                  <div className="text-sm text-gray-500">/100</div>
                </div>
              )}
            </div>
            {result.overallScore != null && (
              <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    result.overallScore >= 80
                      ? "bg-emerald-500"
                      : result.overallScore >= 60
                      ? "bg-amber-500"
                      : "bg-red-500"
                  }`}
                  style={{ width: `${result.overallScore}%` }}
                />
              </div>
            )}
            {result.headline && (
              <p className="mt-4 text-sm text-gray-400 italic">&quot;{result.headline}&quot;</p>
            )}
          </div>

          {/* Strengths */}
          {result.strengths?.length > 0 && (
            <div className="glass-card overflow-hidden">
              <button
                onClick={() => toggleSection("strengths")}
                className="flex w-full items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-emerald-400" />
                  <span className="font-medium text-gray-200">Strengths ({result.strengths.length})</span>
                </div>
                {openSection === "strengths" ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </button>
              {openSection === "strengths" && (
                <div className="border-t border-white/[0.06] p-5">
                  <ul className="space-y-2">
                    {result.strengths.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Improvements */}
          {result.improvements?.length > 0 && (
            <div className="glass-card overflow-hidden">
              <button
                onClick={() => toggleSection("improvements")}
                className="flex w-full items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400" />
                  <span className="font-medium text-gray-200">Areas to Improve ({result.improvements.length})</span>
                </div>
                {openSection === "improvements" ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </button>
              {openSection === "improvements" && (
                <div className="border-t border-white/[0.06] p-5">
                  <ul className="space-y-2">
                    {result.improvements.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-amber-400" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Keyword Suggestions */}
          {result.keywords?.length > 0 && (
            <div className="glass-card overflow-hidden">
              <button
                onClick={() => toggleSection("keywords")}
                className="flex w-full items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Sparkles className="h-5 w-5 text-signal-cyan" />
                  <span className="font-medium text-gray-200">Keywords to Add ({result.keywords.length})</span>
                </div>
                {openSection === "keywords" ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </button>
              {openSection === "keywords" && (
                <div className="border-t border-white/[0.06] p-5">
                  <div className="flex flex-wrap gap-2">
                    {result.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="rounded-md border border-signal-cyan/20 bg-signal-cyan/10 px-2.5 py-1 text-xs text-signal-cyan"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Rewrite Suggestion */}
          {result.rewrittenAbout && (
            <div className="glass-card overflow-hidden">
              <button
                onClick={() => toggleSection("rewrite")}
                className="flex w-full items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <ArrowRight className="h-5 w-5 text-signal-violet" />
                  <span className="font-medium text-gray-200">Suggested Rewrite</span>
                </div>
                {openSection === "rewrite" ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </button>
              {openSection === "rewrite" && (
                <div className="border-t border-white/[0.06] p-5">
                  <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {result.rewrittenAbout}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result.rewrittenAbout ?? "");
                      toast.success("Copied to clipboard!");
                    }}
                    className="mt-3 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                  >
                    Copy text
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
