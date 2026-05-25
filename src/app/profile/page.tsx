"use client";
import { useEffect, useState } from "react";
import { User, Save, Plus, X, RefreshCw } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import ResumeUpload from "@/components/resume/ResumeUpload";
import Spinner from "@/components/ui/Spinner";
import { useAppStore } from "@/store/useAppStore";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const { profile, setProfile, setIsFetchingJobs } = useAppStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState({
    skills: [] as string[],
    titles: [] as string[],
    experienceYears: 0,
    location: "",
    desiredRole: "",
    summary: "",
    education: [] as Array<{ degree?: string; field?: string; school?: string }>,
  });
  const [newSkill, setNewSkill] = useState("");
  const [newTitle, setNewTitle] = useState("");

  useEffect(() => {
    fetch("/api/resume")
      .then((r) => r.json())
      .then((d) => {
        if (d.profile) {
          setProfile(d.profile);
          setForm({
            skills: d.profile.skills ?? [],
            titles: d.profile.titles ?? [],
            experienceYears: d.profile.experienceYears ?? 0,
            location: d.profile.location ?? "",
            desiredRole: d.profile.desiredRole ?? "",
            summary: d.profile.summary ?? "",
            education: d.profile.education ?? [],
          });
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSave = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/resume", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.profile);
        toast.success("Profile updated!");

        // Re-fetch jobs with new profile
        setIsFetchingJobs(true);
        const fetchRes = await fetch("/api/jobs/fetch", { method: "POST" });
        const fetchData = await fetchRes.json();
        if (fetchData.success) {
          toast.success(`Re-scored ${fetchData.jobsFound} jobs`);
          window.dispatchEvent(new CustomEvent("jobs-refreshed"));
        }
      } else {
        toast.error(data.error || "Failed to save");
      }
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  const addSkill = () => {
    const s = newSkill.trim();
    if (s && !form.skills.includes(s)) {
      setForm((f) => ({ ...f, skills: [...f.skills, s] }));
      setNewSkill("");
    }
  };

  const removeSkill = (s: string) =>
    setForm((f) => ({ ...f, skills: f.skills.filter((x) => x !== s) }));

  const addTitle = () => {
    const t = newTitle.trim();
    if (t && !form.titles.includes(t)) {
      setForm((f) => ({ ...f, titles: [...f.titles, t] }));
      setNewTitle("");
    }
  };

  const removeTitle = (t: string) =>
    setForm((f) => ({ ...f, titles: f.titles.filter((x) => x !== t) }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-signal-bg">
        <Navbar />
        <div className="flex items-center justify-center min-h-[70vh]">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-signal-bg bg-signal-gradient">
      <Navbar />
      <main className="mx-auto max-w-3xl px-4 pb-16 pt-24 md:px-6">

        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2">
              <User className="h-6 w-6 text-signal-cyan" />
              Your Profile
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Edit your parsed resume data — changes trigger a re-score of all jobs
            </p>
          </div>
          {profile && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 rounded-xl bg-signal-cyan px-4 py-2.5 text-sm font-semibold text-signal-bg hover:bg-signal-cyan/90 transition-all disabled:opacity-50"
            >
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {isSaving ? "Saving…" : "Save Changes"}
            </button>
          )}
        </div>

        {!profile ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-dashed border-white/[0.12] bg-signal-surface/30 p-8 text-center">
              <p className="text-gray-400 mb-6">No resume uploaded yet. Upload one to get started.</p>
              <ResumeUpload onSuccess={() => window.location.reload()} />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="glass-card p-6">
              <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Basic Info</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Desired Role</label>
                  <input
                    value={form.desiredRole}
                    onChange={(e) => setForm((f) => ({ ...f, desiredRole: e.target.value }))}
                    placeholder="e.g. Senior Frontend Engineer"
                    className="w-full rounded-lg border border-white/[0.08] bg-signal-bg/50 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-signal-cyan/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Location</label>
                  <input
                    value={form.location}
                    onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="e.g. San Francisco, CA"
                    className="w-full rounded-lg border border-white/[0.08] bg-signal-bg/50 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-signal-cyan/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1.5">Years of Experience</label>
                  <input
                    type="number"
                    min={0}
                    max={50}
                    value={form.experienceYears}
                    onChange={(e) => setForm((f) => ({ ...f, experienceYears: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-white/[0.08] bg-signal-bg/50 px-3 py-2 text-sm text-gray-200 focus:border-signal-cyan/40 focus:outline-none"
                  />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-xs text-gray-500 mb-1.5">Professional Summary</label>
                <textarea
                  value={form.summary}
                  onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
                  placeholder="Brief professional summary…"
                  rows={3}
                  className="w-full rounded-lg border border-white/[0.08] bg-signal-bg/50 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-signal-cyan/40 focus:outline-none resize-none"
                />
              </div>
            </div>

            {/* Skills */}
            <div className="glass-card p-6">
              <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Skills</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {form.skills.map((skill) => (
                  <span
                    key={skill}
                    className="flex items-center gap-1.5 rounded-lg border border-signal-cyan/20 bg-signal-cyan/10 px-2.5 py-1 text-sm text-signal-cyan"
                  >
                    {skill}
                    <button onClick={() => removeSkill(skill)} className="text-signal-cyan/60 hover:text-signal-cyan">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addSkill()}
                  placeholder="Add a skill…"
                  className="flex-1 rounded-lg border border-white/[0.08] bg-signal-bg/50 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-signal-cyan/40 focus:outline-none"
                />
                <button
                  onClick={addSkill}
                  className="flex items-center gap-1 rounded-lg border border-signal-cyan/20 bg-signal-cyan/10 px-3 py-2 text-sm text-signal-cyan hover:bg-signal-cyan/20 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Job Titles */}
            <div className="glass-card p-6">
              <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Past Job Titles</h2>
              <div className="flex flex-wrap gap-2 mb-4">
                {form.titles.map((title) => (
                  <span
                    key={title}
                    className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-sm text-gray-300"
                  >
                    {title}
                    <button onClick={() => removeTitle(title)} className="text-gray-600 hover:text-gray-400">
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTitle()}
                  placeholder="Add a job title…"
                  className="flex-1 rounded-lg border border-white/[0.08] bg-signal-bg/50 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-signal-cyan/40 focus:outline-none"
                />
                <button
                  onClick={addTitle}
                  className="flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-sm text-gray-400 hover:text-gray-200 hover:bg-white/[0.08] transition-all"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
              </div>
            </div>

            {/* Re-upload */}
            <div className="glass-card p-6">
              <h2 className="text-sm font-semibold text-gray-300 mb-4 uppercase tracking-wider">Update Resume</h2>
              <p className="text-xs text-gray-500 mb-4">
                Upload a new resume to replace your current profile. All jobs will be re-fetched and re-scored.
              </p>
              <ResumeUpload compact onSuccess={() => window.location.reload()} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
