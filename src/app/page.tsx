import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ArrowRight, Zap, Briefcase, Sparkles, Radar } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-signal-bg bg-signal-gradient bg-grid">
      {/* Nav */}
      <nav className="mx-auto max-w-6xl flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <div className="radar-icon h-8 w-8 rounded-full bg-signal-surface flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-signal-cyan shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
          </div>
          <span className="font-bold text-lg gradient-text">JobRadar</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-gray-400 hover:text-gray-200 transition-colors">Sign in</Link>
          <Link href="/signup" className="rounded-xl bg-signal-cyan px-4 py-2 text-sm font-semibold text-signal-bg hover:bg-signal-cyan/90 transition-colors">
            Get started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <main className="mx-auto max-w-5xl px-6 py-20 text-center">
        {/* Radar logo */}
        <div className="mb-12 inline-flex flex-col items-center">
          <div className="relative mb-6">
            <div className="h-40 w-40 rounded-full border border-signal-cyan/15 flex items-center justify-center">
              <div className="h-28 w-28 rounded-full border border-signal-cyan/10 flex items-center justify-center">
                <div className="h-16 w-16 rounded-full border border-signal-cyan/10 flex items-center justify-center">
                  <div className="radar-icon h-10 w-10 rounded-full bg-signal-surface flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-signal-cyan shadow-[0_0_16px_rgba(6,182,212,1)]" />
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute inset-0 rounded-full" style={{
              background: "conic-gradient(from 0deg, transparent 70%, rgba(6,182,212,0.25) 100%)",
              animation: "radar-sweep 3s linear infinite",
            }} />
          </div>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-gray-100 mb-6">
          Job search,{" "}
          <span className="gradient-text">tuned to you.</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-10">
          Upload your resume. Get AI-ranked jobs from LinkedIn, Indeed, and Adzuna — every day, automatically.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-20">
          <Link href="/signup"
            className="group flex items-center gap-2 rounded-xl bg-signal-cyan px-6 py-3 text-sm font-semibold text-signal-bg hover:bg-signal-cyan/90 transition-all">
            Get started free
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <Link href="/login"
            className="rounded-xl border border-white/[0.08] bg-signal-surface px-6 py-3 text-sm font-medium text-gray-300 hover:bg-signal-card-hover transition-all">
            Sign in
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
          {[
            { icon: Radar, title: "AI Match Scoring", desc: "Every job gets a 0–100 score based on your resume.", color: "text-signal-cyan" },
            { icon: Briefcase, title: "Multi-Source Aggregation", desc: "LinkedIn, Indeed, Adzuna — deduplicated and ranked.", color: "text-signal-violet" },
            { icon: Sparkles, title: "AI Cover Letters & Prep", desc: "Personalized cover letters, interview questions, market trends.", color: "text-emerald-400" },
          ].map((feat) => {
            const Icon = feat.icon;
            return (
              <div key={feat.title} className="glass-card p-5">
                <Icon className={`h-6 w-6 mb-3 ${feat.color}`} />
                <h3 className="font-semibold text-gray-200 mb-1.5">{feat.title}</h3>
                <p className="text-sm text-gray-500">{feat.desc}</p>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="py-12 text-center text-xs text-gray-600">
        Built with Claude, Next.js, and Supabase
      </footer>
    </div>
  );
}
