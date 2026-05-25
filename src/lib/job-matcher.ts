import Anthropic from "@anthropic-ai/sdk";
import type { ParsedProfile } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export interface MatchResult {
  score: number;
  reasons: string[];
  whyMatch: string;
}

export async function scoreJob(
  job: { title: string; company: string; description: string; requirements?: string | null },
  profile: ParsedProfile
): Promise<MatchResult> {
  const prompt = `You are an expert job-resume matcher. Analyze how well this candidate matches this job.

CANDIDATE PROFILE:
- Current/Past Titles: ${profile.titles.slice(0, 5).join(", ")}
- Skills: ${profile.skills.slice(0, 20).join(", ")}
- Years of Experience: ${profile.experienceYears}
- Education: ${profile.education.map((e) => `${e.degree} in ${e.field} from ${e.school}`).join(", ") || "Not specified"}
- Location: ${profile.location || "Flexible"}
- Desired Role: ${profile.desiredRole || "Not specified"}

JOB POSTING:
- Title: ${job.title}
- Company: ${job.company}
- Description: ${job.description.slice(0, 2000)}
${job.requirements ? `- Requirements: ${job.requirements.slice(0, 1000)}` : ""}

Return ONLY valid JSON (no markdown):
{
  "score": <integer 0-100>,
  "reasons": ["reason1", "reason2", "reason3"],
  "whyMatch": "<2-3 sentences explaining the match>"
}

Scoring guide:
- 80-100: Excellent match — candidate meets most/all requirements
- 50-79: Good match — candidate meets core requirements with some gaps
- 25-49: Partial match — relevant experience but significant gaps
- 0-24: Poor match — major skill or experience misalignment

reasons: 3 specific bullet points mapping candidate skills to job requirements (or noting gaps).
whyMatch: Encouraging, specific explanation of why this role fits the candidate.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      messages: [{ role: "user", content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") throw new Error("Unexpected response type");

    const jsonMatch = content.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const result = JSON.parse(jsonMatch[0]);
    return {
      score: Math.max(0, Math.min(100, Number(result.score) || 0)),
      reasons: Array.isArray(result.reasons) ? result.reasons.slice(0, 5) : [],
      whyMatch: result.whyMatch || "",
    };
  } catch {
    // Return a default score if Claude fails
    return {
      score: 0,
      reasons: ["Unable to score — AI service unavailable"],
      whyMatch: "Match scoring is currently unavailable.",
    };
  }
}

// ─── Batch Scoring (with rate limiting) ──────────────────────

export async function batchScoreJobs(
  jobs: Array<{ id: string; title: string; company: string; description: string; requirements?: string | null }>,
  profile: ParsedProfile,
  onProgress?: (completed: number, total: number) => void
): Promise<Map<string, MatchResult>> {
  const results = new Map<string, MatchResult>();

  // Process in batches of 3 to avoid rate limits
  const batchSize = 3;
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((job) => scoreJob(job, profile).then((result) => ({ id: job.id, result })))
    );

    for (const settled of batchResults) {
      if (settled.status === "fulfilled") {
        results.set(settled.value.id, settled.value.result);
      }
    }

    onProgress?.(Math.min(i + batchSize, jobs.length), jobs.length);

    // Small delay between batches to respect rate limits
    if (i + batchSize < jobs.length) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  return results;
}

// ─── Cover Letter Generation ──────────────────────────────────

export async function generateCoverLetter(
  job: { title: string; company: string; description: string },
  profile: ParsedProfile
): Promise<string> {
  const prompt = `Write a compelling, personalized cover letter for this job application.

CANDIDATE PROFILE:
- Titles: ${profile.titles.slice(0, 3).join(", ")}
- Skills: ${profile.skills.slice(0, 15).join(", ")}
- Experience: ${profile.experienceYears} years
- Education: ${profile.education[0] ? `${profile.education[0].degree} in ${profile.education[0].field}` : "Not specified"}
- Summary: ${profile.summary || "Not provided"}

JOB:
- Title: ${job.title}
- Company: ${job.company}
- Description: ${job.description.slice(0, 2000)}

Write a professional cover letter that:
1. Opens with a strong, specific hook (not "I am applying for...")
2. Highlights 2-3 specific achievements/skills that match the role
3. Shows enthusiasm for this specific company and role
4. Closes with a confident call to action
5. Is 3-4 paragraphs, ~300-400 words

Return only the cover letter text, no subject line or metadata.`;

  const message = await anthropic.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") throw new Error("Unexpected response type");
  return content.text;
}
