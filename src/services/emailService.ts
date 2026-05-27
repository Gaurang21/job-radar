import type { Job } from "@/types";
import { formatSalary, formatRelativeDate } from "@/lib/utils";

export async function sendEmailDigest(
  jobs: Job[],
  recipientEmail: string
): Promise<{ success: boolean; error?: string }> {
  const RESEND_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_KEY) return { success: false, error: "Resend API key not configured" };

  const fromEmail = process.env.DIGEST_FROM_EMAIL || "JobRadar <noreply@jobradar.app>";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const top10 = jobs
    .filter((j) => j.match_score > 0)
    .sort((a, b) => b.match_score - a.match_score)
    .slice(0, 10);

  if (top10.length === 0) return { success: false, error: "No scored jobs for digest" };

  const html = buildDigestHtml(top10, appUrl);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [recipientEmail],
        subject: `🎯 Your JobRadar Digest — ${top10.length} top matches`,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `Resend error ${res.status}: ${body}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}

function buildDigestHtml(jobs: Job[], appUrl: string): string {
  const jobRows = jobs.map((job) => `
    <tr>
      <td style="padding: 16px; border-bottom: 1px solid #1e293b;">
        <div style="font-size: 16px; font-weight: 600; color: #f1f5f9; margin-bottom: 4px;">${escapeHtml(job.title)}</div>
        <div style="font-size: 14px; color: #94a3b8; margin-bottom: 8px;">${escapeHtml(job.company)} · ${escapeHtml(job.location ?? "Remote")}</div>
        <div style="margin-bottom: 8px;">
          <span style="display: inline-block; padding: 2px 10px; background: ${getScoreBg(job.match_score)}; border-radius: 20px; font-size: 13px; font-weight: 700; color: white;">${job.match_score}% Match</span>
          ${job.salary_min || job.salary_max ? `<span style="margin-left: 8px; font-size: 13px; color: #64748b;">${formatSalary(job.salary_min, job.salary_max)}</span>` : ""}
          <span style="margin-left: 8px; font-size: 13px; color: #64748b;">${formatRelativeDate(job.posted_date ?? job.created_at)}</span>
        </div>
        <a href="${escapeHtml(job.application_url)}" style="display: inline-block; padding: 6px 16px; background: linear-gradient(135deg, #06b6d4, #0891b2); color: white; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600;">Quick Apply →</a>
        <a href="${appUrl}/jobs" style="margin-left: 8px; display: inline-block; padding: 6px 16px; background: transparent; color: #06b6d4; text-decoration: none; border-radius: 6px; font-size: 13px; font-weight: 600; border: 1px solid #06b6d4;">View in JobRadar</a>
      </td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin: 0; padding: 0; background: #030712; font-family: -apple-system, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 24px 16px;">
    <div style="text-align: center; padding: 32px 0 24px; border-bottom: 1px solid #1e293b; margin-bottom: 24px;">
      <div style="font-size: 28px; font-weight: 800; background: linear-gradient(135deg, #06b6d4, #818cf8); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">◉ JobRadar</div>
      <div style="font-size: 14px; color: #64748b; margin-top: 8px;">Your daily digest · ${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</div>
    </div>
    <div style="background: #0c1527; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin-bottom: 24px; text-align: center;">
      <div style="font-size: 32px; font-weight: 800; color: #06b6d4;">${jobs.length}</div>
      <div style="font-size: 14px; color: #64748b;">Top matches today</div>
    </div>
    <table style="width: 100%; border-collapse: collapse; background: #0c1527; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden;">${jobRows}</table>
    <div style="text-align: center; padding: 24px 0; color: #475569; font-size: 12px;">
      <a href="${appUrl}" style="color: #06b6d4; text-decoration: none;">Open JobRadar</a>
    </div>
  </div>
</body></html>`;
}

function getScoreBg(score: number): string {
  if (score >= 80) return "linear-gradient(135deg, #10b981, #059669)";
  if (score >= 50) return "linear-gradient(135deg, #f59e0b, #d97706)";
  return "linear-gradient(135deg, #ef4444, #dc2626)";
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
