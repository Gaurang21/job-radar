import type { Job } from "@/types";
import { formatSalary, formatRelativeDate } from "./utils";

// ─── Resend Email ─────────────────────────────────────────────

export async function sendEmailDigest(
  jobs: Job[],
  recipientEmail: string
): Promise<{ success: boolean; error?: string }> {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) {
    return { success: false, error: "Resend API key not configured" };
  }

  const top10 = jobs
    .filter((j) => j.matchScore != null)
    .sort((a, b) => (b.matchScore ?? 0) - (a.matchScore ?? 0))
    .slice(0, 10);

  if (top10.length === 0) {
    return { success: false, error: "No scored jobs to include in digest" };
  }

  const html = buildDigestHtml(top10);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "JobRadar <digest@jobradar.app>",
        to: [recipientEmail],
        subject: `🎯 Your Daily JobRadar Digest — ${top10.length} top matches`,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `Resend error: ${res.status} — ${body}` };
    }

    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return { success: false, error: message };
  }
}

function buildDigestHtml(jobs: Job[]): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const jobRows = jobs
    .map(
      (job) => `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #1e293b;">
        <div style="font-size: 16px; font-weight: 600; color: #f1f5f9; margin-bottom: 4px;">
          ${escapeHtml(job.title)}
        </div>
        <div style="font-size: 14px; color: #94a3b8; margin-bottom: 8px;">
          ${escapeHtml(job.company)} · ${escapeHtml(job.location ?? "Remote")}
        </div>
        <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 8px; flex-wrap: wrap;">
          <span style="display: inline-block; padding: 2px 10px; background: ${getScoreColor(job.matchScore)}; border-radius: 20px; font-size: 13px; font-weight: 700; color: white;">
            ${job.matchScore ?? 0}% Match
          </span>
          ${job.salaryMin || job.salaryMax ? `<span style="font-size: 13px; color: #64748b;">${formatSalary(job.salaryMin, job.salaryMax)}</span>` : ""}
          <span style="font-size: 13px; color: #64748b;">Posted ${formatRelativeDate(job.postedDate ?? job.createdAt)}</span>
        </div>
        <a href="${escapeHtml(job.applicationUrl)}"
           style="display: inline-block; padding: 6px 16px; background: linear-gradient(135deg, #06b6d4, #0891b2); color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600;">
          Quick Apply →
        </a>
        <a href="${appUrl}/jobs"
           style="display: inline-block; padding: 6px 16px; background: transparent; color: #06b6d4; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600; border: 1px solid #06b6d4; margin-left: 8px;">
          View in JobRadar
        </a>
      </td>
    </tr>`
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin: 0; padding: 0; background: #030712; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">

    <!-- Header -->
    <div style="text-align: center; padding: 32px 0 24px; border-bottom: 1px solid #1e293b; margin-bottom: 24px;">
      <div style="font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #06b6d4, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 8px;">
        ◉ JobRadar
      </div>
      <div style="font-size: 14px; color: #64748b;">Your daily job digest · ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
    </div>

    <!-- Stats -->
    <div style="background: #0c1527; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <div style="font-size: 32px; font-weight: 800; color: #06b6d4; margin-bottom: 4px;">${jobs.length}</div>
      <div style="font-size: 14px; color: #64748b;">Top matches today</div>
    </div>

    <!-- Jobs -->
    <table style="width: 100%; border-collapse: collapse; background: #0c1527; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden;">
      ${jobRows}
    </table>

    <!-- Footer -->
    <div style="text-align: center; padding: 24px 0; color: #475569; font-size: 12px;">
      <a href="${appUrl}" style="color: #06b6d4; text-decoration: none;">Open JobRadar</a> ·
      Sent to ${process.env.DIGEST_EMAIL_TO}
    </div>
  </div>
</body>
</html>`;
}

function getScoreColor(score?: number | null): string {
  if (!score) return "#475569";
  if (score >= 80) return "linear-gradient(135deg, #10b981, #059669)";
  if (score >= 50) return "linear-gradient(135deg, #f59e0b, #d97706)";
  return "linear-gradient(135deg, #ef4444, #dc2626)";
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
