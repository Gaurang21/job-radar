"use client";
export const dynamic = "force-dynamic";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    // Supabase puts the access_token in the URL fragment (#access_token=...)
    // The client SDK handles the session exchange automatically on mount
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setSessionReady(true);
      }
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 2000);
  };

  if (done) {
    return (
      <div className="text-center">
        <div className="mb-4 flex justify-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold text-gray-100 mb-2">Password updated!</h1>
        <p className="text-sm text-gray-500">Redirecting you to the dashboard…</p>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-signal-cyan mb-4" />
        <p className="text-sm text-gray-500">Verifying reset link…</p>
        <p className="mt-4 text-xs text-gray-600">
          If this takes too long,{" "}
          <Link href="/forgot-password" className="text-signal-cyan hover:underline">
            request a new link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-gray-100">Set a new password</h1>
        <p className="mt-2 text-sm text-gray-500">Choose a strong password for your account</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (min 6 chars)"
            className="w-full rounded-xl border border-white/[0.08] bg-signal-surface pl-10 pr-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:border-signal-cyan/40 focus:outline-none focus:ring-1 focus:ring-signal-cyan/20"
          />
        </div>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm new password"
            className="w-full rounded-xl border border-white/[0.08] bg-signal-surface pl-10 pr-4 py-3 text-sm text-gray-200 placeholder-gray-600 focus:border-signal-cyan/40 focus:outline-none focus:ring-1 focus:ring-signal-cyan/20"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-signal-cyan py-3 text-sm font-semibold text-signal-bg hover:bg-signal-cyan/90 transition-all disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Update password
        </button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-signal-bg bg-signal-gradient bg-grid p-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex items-center justify-center gap-3">
          <div className="radar-icon h-10 w-10 rounded-full bg-signal-surface flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-signal-cyan shadow-[0_0_12px_rgba(6,182,212,0.9)]" />
          </div>
          <span className="text-2xl font-bold gradient-text">JobRadar</span>
        </div>
        <Suspense fallback={
          <div className="text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-signal-cyan" />
          </div>
        }>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
