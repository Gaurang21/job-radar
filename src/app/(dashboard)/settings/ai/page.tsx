"use client";
import { useEffect, useState } from "react";
import {
  Sparkles, Eye, EyeOff, CheckCircle, XCircle,
  Save, Loader2, ToggleLeft, ToggleRight,
} from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import toast from "react-hot-toast";
import type { CoverLetterTone, AIProvider } from "@/types";

interface AISettingsData {
  ai_provider: AIProvider;
  match_scoring_enabled: boolean;
  why_match_enabled: boolean;
  job_summary_enabled: boolean;
  skill_gap_enabled: boolean;
  cover_letter_enabled: boolean;
  interview_prep_enabled: boolean;
  email_draft_enabled: boolean;
  linkedin_analyzer_enabled: boolean;
  market_pulse_enabled: boolean;
  rejection_analyzer_enabled: boolean;
  cover_letter_tone: CoverLetterTone;
  hasAnthropicKey: boolean;
  anthropicKeyMask: string;
  hasGroqKey: boolean;
  groqKeyMask: string;
}

const FEATURE_TOGGLES: { key: keyof AISettingsData; label: string; description: string }[] = [
  { key: "match_scoring_enabled", label: "Match Scoring", description: "Score jobs 0–100 based on your resume" },
  { key: "why_match_enabled", label: "Why You Match", description: "Explain why a job fits your profile" },
  { key: "job_summary_enabled", label: "Job Summary", description: "AI-powered 5-bullet summaries" },
  { key: "skill_gap_enabled", label: "Skill Gap Analysis", description: "Identify missing skills per job" },
  { key: "cover_letter_enabled", label: "Cover Letters", description: "Generate personalized cover letters" },
  { key: "interview_prep_enabled", label: "Interview Prep", description: "Generate likely interview questions" },
  { key: "email_draft_enabled", label: "Outreach Emails", description: "Draft emails to hiring managers" },
  { key: "linkedin_analyzer_enabled", label: "LinkedIn Analyzer", description: "Analyze and improve your LinkedIn profile" },
  { key: "market_pulse_enabled", label: "Market Pulse", description: "AI insights about your job market" },
  { key: "rejection_analyzer_enabled", label: "Rejection Analyzer", description: "Find patterns in rejections (5+ needed)" },
];

const PROVIDERS: { id: AIProvider; label: string; badge: string; description: string; keyPrefix: string; keyPlaceholder: string; docsUrl: string }[] = [
  {
    id: "anthropic",
    label: "Anthropic Claude",
    badge: "Best quality",
    description: "Claude Sonnet & Opus. Pay-per-use — very affordable for personal use.",
    keyPrefix: "sk-ant-",
    keyPlaceholder: "sk-ant-…",
    docsUrl: "https://console.anthropic.com",
  },
  {
    id: "groq",
    label: "Groq (Free)",
    badge: "Free tier",
    description: "Llama 3.3 70B via Groq's ultra-fast inference. Generous free tier.",
    keyPrefix: "gsk_",
    keyPlaceholder: "gsk_…",
    docsUrl: "https://console.groq.com",
  },
];

export default function AISettingsPage() {
  const [settings, setSettings] = useState<AISettingsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [testError, setTestError] = useState<string | null>(null);
  const [localSettings, setLocalSettings] = useState<Partial<AISettingsData>>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.aiSettings ?? {
          ai_provider: "anthropic",
          match_scoring_enabled: true,
          why_match_enabled: true,
          job_summary_enabled: true,
          skill_gap_enabled: true,
          cover_letter_enabled: true,
          interview_prep_enabled: true,
          email_draft_enabled: true,
          linkedin_analyzer_enabled: true,
          market_pulse_enabled: true,
          rejection_analyzer_enabled: true,
          cover_letter_tone: "formal",
          hasAnthropicKey: false,
          anthropicKeyMask: "",
          hasGroqKey: false,
          groqKeyMask: "",
        });
      })
      .finally(() => setIsLoading(false));
  }, []);

  const merged: AISettingsData | null = settings ? { ...settings, ...localSettings } as AISettingsData : null;
  const activeProvider: AIProvider = merged?.ai_provider ?? "anthropic";
  const activeMeta = PROVIDERS.find((p) => p.id === activeProvider)!;
  const hasActiveKey = activeProvider === "groq" ? merged?.hasGroqKey : merged?.hasAnthropicKey;
  const activeKeyMask = activeProvider === "groq" ? merged?.groqKeyMask : merged?.anthropicKeyMask;

  const toggleFeature = (key: keyof AISettingsData) => {
    setLocalSettings((prev) => ({ ...prev, [key]: !(prev[key] ?? settings?.[key]) }));
  };

  const selectProvider = (provider: AIProvider) => {
    setLocalSettings((prev) => ({ ...prev, ai_provider: provider }));
    setApiKey("");
    setTestStatus("idle");
    setTestError(null);
  };

  const handleTestConnection = async () => {
    setTestStatus("testing");
    setTestError(null);
    try {
      const res = await fetch("/api/ai/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: apiKey || undefined, provider: activeProvider }),
      });
      const data = await res.json();
      if (data.ok) {
        setTestStatus("ok");
      } else {
        setTestStatus("fail");
        setTestError(data.error ?? "Connection failed");
      }
    } catch {
      setTestStatus("fail");
      setTestError("Network error");
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const body: Record<string, unknown> = { ...localSettings };
      if (apiKey !== "") {
        if (activeProvider === "groq") body.groq_api_key = apiKey;
        else body.anthropic_api_key = apiKey;
      }

      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
        return;
      }

      const refreshed = await fetch("/api/settings").then((r) => r.json());
      setSettings(refreshed.aiSettings);
      setLocalSettings({});
      setApiKey("");
      toast.success("Settings saved!");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex items-center justify-center min-h-[70vh]">
        <Spinner size="lg" />
      </main>
    );
  }

  const hasChanges = Object.keys(localSettings).length > 0 || apiKey !== "";

  return (
    <main className="mx-auto max-w-3xl px-4 pb-16 pt-24 md:px-6">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-signal-violet" />
            AI Settings
          </h1>
          <p className="mt-1 text-sm text-gray-500">Choose your AI provider and configure features</p>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-signal-cyan px-4 py-2.5 text-sm font-semibold text-signal-bg hover:bg-signal-cyan/90 transition-all disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? "Saving…" : "Save Changes"}
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Provider Selector */}
        <div className="glass-card p-6">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-gray-300">AI Provider</h2>
          <p className="mb-4 text-xs text-gray-500">Choose which AI powers your features</p>
          <div className="grid grid-cols-2 gap-3">
            {PROVIDERS.map((p) => {
              const active = activeProvider === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => selectProvider(p.id)}
                  className={`rounded-xl border p-4 text-left transition-all ${
                    active
                      ? "border-signal-cyan/40 bg-signal-cyan/5 ring-1 ring-signal-cyan/20"
                      : "border-white/[0.08] bg-signal-surface hover:bg-signal-card-hover"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-gray-100">{p.label}</span>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      p.id === "groq"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-signal-violet/15 text-signal-violet"
                    }`}>
                      {p.badge}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{p.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* API Key */}
        <div className="glass-card p-6">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-gray-300">
            {activeMeta.label} API Key
          </h2>
          <p className="mb-4 text-xs text-gray-500">
            Stored encrypted (AES-256-GCM). Get your key at{" "}
            <a href={activeMeta.docsUrl} target="_blank" rel="noreferrer" className="text-signal-cyan hover:underline">
              {activeMeta.docsUrl.replace("https://", "")}
            </a>
          </p>

          {hasActiveKey && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
              <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
              <span className="text-xs text-emerald-300">
                Key saved: <code className="font-mono">{activeKeyMask}</code>
              </span>
            </div>
          )}

          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setTestStatus("idle"); }}
                placeholder={hasActiveKey ? "Enter new key to replace…" : activeMeta.keyPlaceholder}
                className="w-full rounded-lg border border-white/[0.08] bg-signal-bg/50 px-3 py-2.5 pr-10 text-sm text-gray-200 placeholder-gray-600 focus:border-signal-cyan/40 focus:outline-none font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <button
              onClick={handleTestConnection}
              disabled={testStatus === "testing" || (!apiKey && !hasActiveKey)}
              className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-signal-surface px-4 py-2.5 text-sm text-gray-300 hover:bg-signal-card-hover transition-all disabled:opacity-50"
            >
              {testStatus === "testing" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : testStatus === "ok" ? (
                <CheckCircle className="h-4 w-4 text-emerald-400" />
              ) : testStatus === "fail" ? (
                <XCircle className="h-4 w-4 text-red-400" />
              ) : null}
              Test
            </button>
          </div>

          {testStatus === "ok" && <p className="mt-2 text-xs text-emerald-400">✓ Connection successful</p>}
          {testStatus === "fail" && testError && <p className="mt-2 text-xs text-red-400">✗ {testError}</p>}
        </div>

        {/* Cover Letter Tone */}
        <div className="glass-card p-6">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-gray-300">Cover Letter Tone</h2>
          <p className="mb-4 text-xs text-gray-500">Default tone for all generated cover letters</p>
          <div className="flex gap-2">
            {(["formal", "friendly", "concise"] as CoverLetterTone[]).map((tone) => {
              const active = (merged?.cover_letter_tone ?? "formal") === tone;
              return (
                <button
                  key={tone}
                  onClick={() => setLocalSettings((prev) => ({ ...prev, cover_letter_tone: tone }))}
                  className={`rounded-lg px-4 py-2 text-sm font-medium capitalize transition-all ${
                    active
                      ? "bg-signal-violet/20 text-signal-violet border border-signal-violet/30"
                      : "bg-white/[0.04] text-gray-400 border border-white/[0.06] hover:text-gray-200"
                  }`}
                >
                  {tone}
                </button>
              );
            })}
          </div>
        </div>

        {/* Feature Toggles */}
        <div className="glass-card p-6">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-gray-300">AI Features</h2>
          <p className="mb-4 text-xs text-gray-500">Disable features you don&apos;t need to reduce API usage</p>
          <div className="divide-y divide-white/[0.04]">
            {FEATURE_TOGGLES.map((feat) => {
              const enabled = merged ? !!(merged[feat.key] ?? true) : true;
              return (
                <div key={feat.key} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-gray-200">{feat.label}</p>
                    <p className="text-xs text-gray-500">{feat.description}</p>
                  </div>
                  <button onClick={() => toggleFeature(feat.key as keyof AISettingsData)} className="ml-4 flex-shrink-0">
                    {enabled
                      ? <ToggleRight className="h-6 w-6 text-signal-cyan" />
                      : <ToggleLeft className="h-6 w-6 text-gray-600" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {hasChanges && (
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-signal-cyan px-6 py-2.5 text-sm font-semibold text-signal-bg hover:bg-signal-cyan/90 transition-all disabled:opacity-50"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? "Saving…" : "Save All Changes"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
