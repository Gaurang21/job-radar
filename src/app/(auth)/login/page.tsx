"use client";
export const dynamic = "force-dynamic";
import { useState, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Github, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

const AUTH_ERRORS: Record<string, string> = {
  auth_failed: "Authentication failed. Please try again.",
  email_not_confirmed: "Please confirm your email before signing in.",
  access_denied: "Access was denied. Please try again.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/dashboard";
  const errorCode = searchParams.get("error");
  const supabase = createClient();

  useEffect(() => {
    if (errorCode && AUTH_ERRORS[errorCode]) {
      toast.error(AUTH_ERRORS[errorCode]);
    }
  }, [errorCode]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState<"email" | "google" | "github" | null>(null);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading("email");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(null);
      return;
    }
    toast.success("Welcome back!");
    router.push(next);
    router.refresh();
  };

  const handleOAuth = async (provider: "google" | "github") => {
    setLoading(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      toast.error(error.message);
      setLoading(null);
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Logo */}
      <div className="mb-10 flex items-center justify-center gap-3">
        <div className="radar-icon h-10 w-10 rounded-full bg-signal-surface flex items-center justify-center">
          <div className="h-3 w-3 rounded-full bg-signal-cyan shadow-[0_0_12px_rgba(6,182,212,0.9)]" />
        </div>
        <span className="text-2xl font-bold gradient-text">JobRadar</span>
      </div>

      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-100">Welcome back</h1>
        <p className="mt-2 text-sm text-gray-500">Sign in to continue your job search</p>
      </div>

      {/* OAuth */}
      <div className="space-y-2 mb-6">
        <button
          onClick={() => handleOAuth("google")}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/[0.08] bg-signal-surface px-4 py-3 text-sm font-medium text-gray-200 hover:bg-signal-card-hover transition-all disabled:opacity-50"
        >
          {loading === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : (
            <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          )}
          Continue with Google
        </button>
        <button
          onClick={() => handleOAuth("github")}
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/[0.08] bg-signal-surface px-4 py-3 text-sm font-medium text-gray-200 hover:bg-signal-card-hover transition-all disabled:opacity-50"
        >
          {loading === "github" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Github className="h-4 w-4" />}
          Continue with GitHub
        </button>
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/[0.06]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="px-3 bg-signal-bg text-gray-600">or with email</span>
        </div>
      </div>

      {/* Email Form */}
      <form onSubmit={handleEmailLogin} className="space-y-3">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-xl border border-white/[0.08] bg-signal-surface pl-10 pr-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:border-signal-cyan/40 focus:outline-none focus:ring-1 focus:ring-signal-cyan/20"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-white/[0.08] bg-signal-surface pl-10 pr-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:border-signal-cyan/40 focus:outline-none focus:ring-1 focus:ring-signal-cyan/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading !== null}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-signal-cyan py-3 text-sm font-semibold text-signal-bg hover:bg-signal-cyan/90 transition-all disabled:opacity-50"
        >
          {loading === "email" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Sign In
        </button>
      </form>

      <div className="mt-4 text-center">
        <Link href="/forgot-password" className="text-sm text-gray-500 hover:text-signal-cyan transition-colors">
          Forgot your password?
        </Link>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        Don't have an account?{" "}
        <Link href="/signup" className="text-signal-cyan hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-signal-bg bg-signal-gradient bg-grid p-4">
      <Suspense fallback={<div className="text-gray-500">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
