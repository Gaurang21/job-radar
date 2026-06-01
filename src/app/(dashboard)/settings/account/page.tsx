"use client";
import { useEffect, useState } from "react";
import { User, Mail, Bell, Save, Loader2, Trash2, AlertTriangle } from "lucide-react";
import Spinner from "@/components/ui/Spinner";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface AccountData {
  full_name: string | null;
  email: string;
  digest_opt_in: boolean;
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [account, setAccount] = useState<AccountData>({ full_name: "", email: "", digest_opt_in: false });
  const [localAccount, setLocalAccount] = useState<Partial<AccountData>>({});
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  useEffect(() => {
    const supabase = createClient();
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      supabase.auth.getUser(),
    ]).then(([settingsData, { data: { user } }]) => {
      setAccount({
        full_name: settingsData.profile?.full_name ?? "",
        email: user?.email ?? "",
        digest_opt_in: settingsData.profile?.digest_opt_in ?? false,
      });
    }).finally(() => setIsLoading(false));
  }, []);

  const merged = { ...account, ...localAccount };
  const hasChanges = Object.keys(localAccount).length > 0;

  const handleSaveProfile = async () => {
    if (isSaving || !hasChanges) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: merged.full_name,
          digest_opt_in: merged.digest_opt_in,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
        return;
      }
      setAccount(merged);
      setLocalAccount({});
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setIsChangingPassword(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Password updated!");
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "delete my account") return;
    setIsDeletingAccount(true);
    try {
      const res = await fetch("/api/settings", { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to delete account");
        setIsDeletingAccount(false);
        return;
      }
      await createClient().auth.signOut();
      toast.success("Account deleted. Goodbye!");
      router.push("/");
    } catch {
      toast.error("Failed to delete account");
      setIsDeletingAccount(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex items-center justify-center min-h-[70vh]">
        <Spinner size="lg" />
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 pb-16 pt-24 md:px-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
          <User className="h-6 w-6 text-signal-cyan" />
          Account Settings
        </h1>
        <p className="mt-1 text-sm text-gray-500">Manage your profile and preferences</p>
      </div>

      <div className="space-y-6">
        {/* Profile */}
        <div className="glass-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-300">Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs text-gray-500">Full Name</label>
              <input
                value={merged.full_name ?? ""}
                onChange={(e) => setLocalAccount((prev) => ({ ...prev, full_name: e.target.value }))}
                placeholder="Your full name"
                className="w-full rounded-lg border border-white/[0.08] bg-signal-bg/50 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:border-signal-cyan/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-gray-500">Email</label>
              <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-signal-bg/30 px-3 py-2.5">
                <Mail className="h-4 w-4 text-gray-600" />
                <span className="text-sm text-gray-400">{account.email}</span>
              </div>
              <p className="mt-1 text-xs text-gray-600">Email address cannot be changed here</p>
            </div>
          </div>
          {hasChanges && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="flex items-center gap-2 rounded-xl bg-signal-cyan px-4 py-2.5 text-sm font-semibold text-signal-bg hover:bg-signal-cyan/90 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {isSaving ? "Saving…" : "Save"}
              </button>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="glass-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-300">Notifications</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="h-5 w-5 text-signal-violet" />
              <div>
                <p className="text-sm font-medium text-gray-200">Daily Job Digest</p>
                <p className="text-xs text-gray-500">Receive a daily email with your top job matches</p>
              </div>
            </div>
            <button
              onClick={() => {
                const newVal = !merged.digest_opt_in;
                setLocalAccount((prev) => ({ ...prev, digest_opt_in: newVal }));
                // Auto-save digest setting
                fetch("/api/settings", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ digest_opt_in: newVal }),
                }).then(() => {
                  setAccount((prev) => ({ ...prev, digest_opt_in: newVal }));
                  setLocalAccount((prev) => { const n = {...prev}; delete n.digest_opt_in; return n; });
                  toast.success(newVal ? "Digest enabled" : "Digest disabled");
                });
              }}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                merged.digest_opt_in ? "bg-signal-cyan" : "bg-gray-700"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                merged.digest_opt_in ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>
        </div>

        {/* Change Password */}
        <div className="glass-card p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-300">Change Password</h2>
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-xs text-gray-500">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full rounded-lg border border-white/[0.08] bg-signal-bg/50 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:border-signal-cyan/40 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-gray-500">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="w-full rounded-lg border border-white/[0.08] bg-signal-bg/50 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:border-signal-cyan/40 focus:outline-none"
              />
            </div>
            <button
              onClick={handleChangePassword}
              disabled={isChangingPassword || !newPassword}
              className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-signal-surface px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-signal-card-hover transition-all disabled:opacity-50"
            >
              {isChangingPassword && <Loader2 className="h-4 w-4 animate-spin" />}
              Update Password
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="glass-card border-red-500/20 p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-red-400">Danger Zone</h2>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/20 transition-all"
            >
              <Trash2 className="h-4 w-4" />
              Delete Account
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 p-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-400" />
                <p className="text-xs text-red-300">
                  This permanently deletes your account, resume, jobs, pipeline, and all associated data. This cannot be undone.
                  Type <code className="font-mono font-bold">delete my account</code> to confirm.
                </p>
              </div>
              <input
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder='Type "delete my account"'
                className="w-full rounded-lg border border-red-500/20 bg-signal-bg/50 px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 focus:border-red-500/40 focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeletingAccount || deleteConfirmText !== "delete my account"}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {isDeletingAccount && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirm Delete
                </button>
                <button
                  onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(""); }}
                  className="rounded-xl border border-white/[0.08] px-4 py-2.5 text-sm text-gray-400 hover:text-gray-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
