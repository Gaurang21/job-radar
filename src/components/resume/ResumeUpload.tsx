"use client";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/useAppStore";
import toast from "react-hot-toast";

interface Props {
  onSuccess?: () => void;
  compact?: boolean;
}

export default function ResumeUpload({ onSuccess, compact = false }: Props) {
  const [status, setStatus] = useState<"idle" | "uploading" | "success" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const { setProfile, setIsFetchingJobs } = useAppStore();

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      setFileName(file.name);
      setStatus("uploading");
      setError(null);

      try {
        const formData = new FormData();
        formData.append("resume", file);

        const res = await fetch("/api/resume", { method: "POST", body: formData });
        const data = await res.json();

        if (!res.ok) {
          if (data.code === "ANTHROPIC_ERROR") throw new Error("⚠️ AI parsing failed — check Anthropic API key");
          throw new Error(data.error || "Upload failed");
        }

        setProfile(data.profile);
        setStatus("success");
        toast.success("Resume parsed! Fetching matching jobs…");

        // Auto-fetch jobs
        setIsFetchingJobs(true);
        try {
          const fetchRes = await fetch("/api/jobs/fetch", { method: "POST" });
          const fetchData = await fetchRes.json();
          if (fetchData.success) {
            toast.success(`Found ${fetchData.jobsFound} jobs`);
            window.dispatchEvent(new CustomEvent("jobs-refreshed"));
          } else {
            toast.error(fetchData.error || "Job fetch failed — try Refresh manually");
          }
        } finally {
          setIsFetchingJobs(false);
        }

        onSuccess?.();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        setStatus("error");
        toast.error(message);
      }
    },
    [onSuccess, setProfile, setIsFetchingJobs]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "text/plain": [".txt"],
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024,
    disabled: status === "uploading",
  });

  if (compact && status === "success") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
        <CheckCircle className="h-4 w-4 text-emerald-400" />
        <span className="text-sm text-emerald-300">Resume uploaded: {fileName}</span>
      </div>
    );
  }

  return (
    <div {...getRootProps()}
      className={cn(
        "relative cursor-pointer rounded-2xl border-2 border-dashed transition-all duration-200",
        isDragActive
          ? "border-signal-cyan bg-signal-cyan/10 shadow-[0_0_30px_rgba(6,182,212,0.2)]"
          : "border-white/[0.12] bg-signal-surface/50 hover:border-signal-cyan/40 hover:bg-signal-surface",
        status === "uploading" && "pointer-events-none opacity-70",
        compact ? "p-4" : "p-8 md:p-12"
      )}>
      <input {...getInputProps()} />

      <div className="flex flex-col items-center text-center">
        <div className={cn(
          "mb-4 flex items-center justify-center rounded-2xl transition-all",
          compact ? "h-12 w-12" : "h-16 w-16",
          isDragActive ? "bg-signal-cyan/20 shadow-[0_0_20px_rgba(6,182,212,0.4)]" : "bg-signal-surface"
        )}>
          {status === "uploading" ? <Loader2 className={cn("animate-spin text-signal-cyan", compact ? "h-6 w-6" : "h-8 w-8")} />
            : status === "success" ? <CheckCircle className={cn("text-emerald-400", compact ? "h-6 w-6" : "h-8 w-8")} />
            : status === "error" ? <AlertCircle className={cn("text-red-400", compact ? "h-6 w-6" : "h-8 w-8")} />
            : isDragActive ? <Upload className={cn("text-signal-cyan", compact ? "h-6 w-6" : "h-8 w-8")} />
            : <FileText className={cn("text-gray-400", compact ? "h-6 w-6" : "h-8 w-8")} />}
        </div>

        {status === "uploading" ? (
          <>
            <p className={cn("font-semibold text-gray-200", compact ? "text-sm" : "text-base")}>Parsing your resume…</p>
            <p className="mt-1 text-xs text-gray-500">Claude is extracting your skills and experience</p>
          </>
        ) : status === "success" ? (
          <>
            <p className={cn("font-semibold text-emerald-400", compact ? "text-sm" : "text-base")}>Resume loaded!</p>
            <p className="mt-1 text-xs text-gray-500">{fileName}</p>
          </>
        ) : status === "error" ? (
          <>
            <p className={cn("font-semibold text-red-400", compact ? "text-sm" : "text-base")}>Upload failed</p>
            <p className="mt-1 text-xs text-red-400/70">{error}</p>
            <p className="mt-2 text-xs text-gray-500">Click or drag to try again</p>
          </>
        ) : (
          <>
            <p className={cn("font-semibold text-gray-200", compact ? "text-sm" : "text-lg")}>
              {isDragActive ? "Drop your resume here" : "Upload your resume"}
            </p>
            {!compact && (
              <p className="mt-2 text-sm text-gray-500">Drag & drop or click to browse — PDF or DOCX, up to 10MB</p>
            )}
            <div className="mt-4 flex items-center gap-2">
              {["PDF", "DOCX", "TXT"].map((ext) => (
                <span key={ext} className="rounded-md border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[11px] font-mono text-gray-500">
                  .{ext.toLowerCase()}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {isDragActive && <div className="absolute inset-0 -z-10 rounded-2xl bg-signal-cyan/5 blur-xl" />}
    </div>
  );
}
