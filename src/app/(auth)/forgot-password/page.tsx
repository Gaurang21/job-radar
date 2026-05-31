"use client";
import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-signal-bg bg-signal-gradient bg-grid p-4">
      <div className="w-full max-w-sm">
        <div className="mb-10 flex items-center justify-center gap-3">
          <div className="radar-icon h-10 w-10 rounded-full bg-signal-surface flex items-center justify-center">
            <div className="h-3 w-3 rounded-full bg-signal-cyan shadow-[0_0_12px_rgba(6,182,212,0.9)]" />
          </div>
          <span className="text-2xl font-bold gradient-text">JobRadar</span>
        </div>

        {sent ? (
          <div className="text-center">
            <div className="mb-4 flex justify-center">
              <CheckCircle2 className="h-12 w-12 text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-100 mb-2">Check your email</h1>
            <p className="text-sm text-gray-500 mb-8">
              We sent a password reset link to <span className="text-gray-300">{email}</span>. Check your inbox and follow the link.
            </p>
            <Link href="/login" className="text-sm text-signal-cyan hover:underline">
              Back to sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="text-2xl font-bold text-gray-100">Reset your password</h1>
              <p className="mt-2 text-sm text-gray-500">
                Enter your email and we&apos;ll send you a reset link
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
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
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-signal-cyan py-3 text-sm font-semibold text-signal-bg hover:bg-signal-cyan/90 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Send reset link
              </button>
            </form>

            <p className="mt-8 text-center">
              <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
