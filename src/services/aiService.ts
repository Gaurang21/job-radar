import Anthropic from "@anthropic-ai/sdk";
import type {
  ParsedProfile,
  MatchResult,
  JobSummary,
  SkillGapResult,
  InterviewPrepResult,
  MarketPulse,
  RejectionPattern,
  LinkedInAnalysis,
  ATSScore,
  CoverLetterTone,
  EmailTone,
  AISettings,
} from "@/types";

// ─── Configuration ────────────────────────────────────────────

const STUB_MODE = process.env.AI_STUB_MODE === "true";
const DEFAULT_MODEL = "claude-sonnet-4-6";
const POWERFUL_MODEL = "claude-opus-4-7";

/**
 * Build an Anthropic client for a given API key (per-user or env fallback).
 * Returns null if no key is available.
 */
function buildClient(apiKey?: string | null): Anthropic | null {
  const key = apiKey || process.env.ANTHROPIC_API_KEY;
  if (!key) return null;
  return new Anthropic({ apiKey: key });
}

interface ServiceContext {
  apiKey?: string | null;
  settings?: Partial<AISettings>;
}

// ─── Helpers ──────────────────────────────────────────────────

async function callClaude(
  ctx: ServiceContext,
  prompt: string,
  options: { model?: string; maxTokens?: number } = {}
): Promise<string | null> {
  if (STUB_MODE) return null;
  const client = buildClient(ctx.apiKey);
  if (!client) return null;
  try {
    const message = await client.messages.create({
      model: options.model ?? DEFAULT_MODEL,
      max_tokens: options.maxTokens ?? 1000,
      messages: [{ role: "user", content: prompt }],
    });
    const block = message.content[0];
    if (block.type !== "text") return null;
    return block.text;
  } catch (err) {
    console.error("Claude API error:", err);
    return null;
  }
}

function parseJsonResponse<T>(text: string | null, fallback: T): T {
  if (!text) return fallback;
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return fallback;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return fallback;
  }
}

function profileSummary(profile: ParsedProfile): string {
  return [
    `Titles: ${profile.titles.slice(0, 4).join(", ")}`,
    `Skills: ${profile.skills.slice(0, 20).join(", ")}`,
    `Experience: ${profile.experienceYears} years`,
    profile.education[0] ? `Education: ${profile.education[0].degree} in ${profile.education[0].field}` : "",
    profile.location ? `Location: ${profile.location}` : "",
    profile.desiredRole ? `Desired: ${profile.desiredRole}` : "",
  ].filter(Boolean).join("\n");
}

// ═══════════════════════════════════════════════════════════════
// 5a. Match Scorer
// ═══════════════════════════════════════════════════════════════

export async function scoreJob(
  ctx: ServiceContext,
  job: { title: string; company: string; description: string; requirements?: string | null },
  profile: ParsedProfile
): Promise<MatchResult> {
  if (ctx.settings?.match_scoring_enabled === false) return stubMatch();

  const prompt = `You are an expert job-resume matcher. Score this match.

CANDIDATE:
${profileSummary(profile)}

JOB:
Title: ${job.title}
Company: ${job.company}
Description: ${job.description.slice(0, 1800)}
${job.requirements ? `Requirements: ${job.requirements.slice(0, 800)}` : ""}

Return ONLY JSON:
{
  "score": <0-100>,
  "reasons": ["bullet 1", "bullet 2", "bullet 3"],
  "whyMatch": "<2-3 sentences>"
}

Scoring: 80-100=excellent, 50-79=good, 25-49=partial, 0-24=poor.`;

  const text = await callClaude(ctx, prompt, { maxTokens: 600 });
  if (!text) return stubMatch(job, profile);

  const parsed = parseJsonResponse<{ score?: number; reasons?: string[]; whyMatch?: string }>(text, {});
  return {
    score: Math.max(0, Math.min(100, Number(parsed.score) || 0)),
    reasons: Array.isArray(parsed.reasons) ? parsed.reasons.slice(0, 5) : [],
    whyMatch: parsed.whyMatch ?? "",
  };
}

function stubMatch(job?: { title: string }, profile?: ParsedProfile): MatchResult {
  const baseScore = Math.floor(Math.random() * 45) + 55;
  return {
    score: baseScore,
    reasons: [
      `Your skills overlap with the requirements for ${job?.title ?? "this role"}`,
      `${profile?.experienceYears ?? 3}+ years of relevant experience`,
      "Strong potential match based on your background",
    ],
    whyMatch: "This role aligns with your professional background and skill set. (Demo mode — enable AI in settings for real analysis.)",
  };
}

// ═══════════════════════════════════════════════════════════════
// 5b. Why You Match Explainer
// ═══════════════════════════════════════════════════════════════

export async function explainMatch(
  ctx: ServiceContext,
  job: { title: string; description: string },
  profile: ParsedProfile
): Promise<{ matched: string[]; transferable: string[]; missing: string[] }> {
  if (ctx.settings?.why_match_enabled === false) return stubExplain();

  const prompt = `Compare candidate to job. Return ONLY JSON:
{
  "matched": ["skills the candidate already has"],
  "transferable": ["skills from adjacent areas that transfer"],
  "missing": ["skills the candidate lacks"]
}

CANDIDATE SKILLS: ${profile.skills.slice(0, 25).join(", ")}
TITLES: ${profile.titles.slice(0, 3).join(", ")}

JOB: ${job.title}
${job.description.slice(0, 1500)}`;

  const text = await callClaude(ctx, prompt, { maxTokens: 500 });
  if (!text) return stubExplain();

  return parseJsonResponse(text, { matched: [], transferable: [], missing: [] });
}

function stubExplain() {
  return {
    matched: ["JavaScript", "React", "TypeScript"],
    transferable: ["Adjacent: Vue.js, Web Components"],
    missing: ["Specific framework experience"],
  };
}

// ═══════════════════════════════════════════════════════════════
// 5c. Job Summary (5 bullets)
// ═══════════════════════════════════════════════════════════════

export async function summarizeJob(
  ctx: ServiceContext,
  job: { title: string; company: string; description: string }
): Promise<JobSummary> {
  if (ctx.settings?.job_summary_enabled === false) return stubSummary();

  const prompt = `Summarize this job in EXACTLY 5 bullets covering: role, requirements, perks, culture, and any red flags.

Return ONLY JSON:
{ "bullets": ["bullet 1", "bullet 2", "bullet 3", "bullet 4", "bullet 5"] }

JOB: ${job.title} at ${job.company}
${job.description.slice(0, 2500)}`;

  const text = await callClaude(ctx, prompt, { maxTokens: 600 });
  if (!text) return stubSummary();

  return parseJsonResponse<JobSummary>(text, stubSummary());
}

function stubSummary(): JobSummary {
  return {
    bullets: [
      "Mid-to-senior software engineering role with modern tech stack",
      "Looking for 3+ years experience and strong fundamentals",
      "Competitive compensation, equity, and comprehensive benefits",
      "Collaborative team culture, hybrid or remote flexibility",
      "(Demo mode — enable AI for real summaries)",
    ],
  };
}

// ═══════════════════════════════════════════════════════════════
// 5d. Skill Gap Detector
// ═══════════════════════════════════════════════════════════════

export async function detectSkillGaps(
  ctx: ServiceContext,
  job: { title: string; description: string },
  profile: ParsedProfile
): Promise<SkillGapResult> {
  if (ctx.settings?.skill_gap_enabled === false) return stubGaps();

  const prompt = `Identify the candidate's skill gaps for this job and give specific advice for each.

Return ONLY JSON:
{
  "matched": ["skill1", "skill2"],
  "transferable": ["skill1", "skill2"],
  "missing": [
    { "skill": "Kubernetes", "advice": "Take a 2-week course on K8s basics; deploy a small app to GKE/EKS to demonstrate." }
  ]
}

CANDIDATE: ${profile.skills.slice(0, 25).join(", ")}
EXPERIENCE: ${profile.experienceYears}y in ${profile.titles[0] ?? "various roles"}

JOB: ${job.title}
${job.description.slice(0, 1800)}`;

  const text = await callClaude(ctx, prompt, { maxTokens: 800 });
  if (!text) return stubGaps();

  return parseJsonResponse<SkillGapResult>(text, stubGaps());
}

function stubGaps(): SkillGapResult {
  return {
    matched: ["React", "TypeScript", "Node.js"],
    transferable: ["Database design", "API architecture"],
    missing: [
      { skill: "Kubernetes", advice: "Take the CKAD prep course and deploy a sample app to demonstrate." },
      { skill: "GraphQL", advice: "Build a small project using Apollo Server to add it to your portfolio." },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════
// 5e. Cover Letter Generator
// ═══════════════════════════════════════════════════════════════

export async function generateCoverLetter(
  ctx: ServiceContext,
  job: { title: string; company: string; description: string },
  profile: ParsedProfile,
  tone: CoverLetterTone = "friendly"
): Promise<string> {
  if (ctx.settings?.cover_letter_enabled === false) return stubCoverLetter(job, profile);

  const toneInstructions = {
    formal: "Professional, polished, traditional business tone. Address as 'Dear Hiring Team'.",
    friendly: "Warm, conversational, enthusiastic but professional. Use 'Hi there' or 'Hello'.",
    concise: "Direct, punchy, no fluff. Keep it under 250 words. Lead with strongest qualification.",
  };

  const prompt = `Write a tailored cover letter.

TONE: ${toneInstructions[tone]}

CANDIDATE:
${profileSummary(profile)}
Summary: ${profile.summary ?? "Experienced professional"}

JOB: ${job.title} at ${job.company}
${job.description.slice(0, 1800)}

Requirements:
1. Open with a specific hook (NOT "I am applying for…")
2. Highlight 2-3 specific achievements that match
3. Show genuine interest in this company/role
4. Confident close with call to action
5. 3-4 paragraphs (concise tone: less)

Return only the letter, no extras.`;

  const text = await callClaude(ctx, prompt, { maxTokens: 1000, model: POWERFUL_MODEL });
  if (!text) return stubCoverLetter(job, profile);
  return text.trim();
}

function stubCoverLetter(job: { title: string; company: string }, profile: ParsedProfile): string {
  return `Dear ${job.company} Team,

I'm writing to express my interest in the ${job.title} role at ${job.company}. With ${profile.experienceYears} years of experience in ${profile.titles[0] ?? "software engineering"}, I bring a strong background in ${profile.skills.slice(0, 3).join(", ")}.

In my previous role, I led initiatives that improved team velocity by 30% and shipped products used by thousands of customers. I'm particularly drawn to ${job.company}'s mission and would be excited to contribute my expertise in ${profile.skills[0] ?? "engineering"} to your team.

I'd welcome the opportunity to discuss how my background aligns with your needs. Thank you for considering my application.

Best regards,
${profile.titles[0] ? "[Your Name]" : "Candidate"}

— (Demo mode: enable AI in settings to generate a real personalized letter)`;
}

// ═══════════════════════════════════════════════════════════════
// 5f. Interview Prep Coach
// ═══════════════════════════════════════════════════════════════

export async function generateInterviewPrep(
  ctx: ServiceContext,
  job: { title: string; company: string; description: string },
  profile: ParsedProfile
): Promise<InterviewPrepResult> {
  if (ctx.settings?.interview_prep_enabled === false) return stubInterviewPrep();

  const prompt = `Generate 8-10 likely interview questions for this job, with suggested answer frameworks.

Return ONLY JSON:
{
  "questions": [
    {
      "question": "Tell me about a time you...",
      "category": "behavioral",
      "framework": "Use STAR: Situation, Task, Action, Result. Focus on..."
    }
  ]
}

Categories: behavioral | technical | experience | company

JOB: ${job.title} at ${job.company}
${job.description.slice(0, 1500)}

CANDIDATE BACKGROUND:
${profileSummary(profile)}`;

  const text = await callClaude(ctx, prompt, { maxTokens: 2000 });
  if (!text) return stubInterviewPrep();

  return parseJsonResponse<InterviewPrepResult>(text, stubInterviewPrep());
}

function stubInterviewPrep(): InterviewPrepResult {
  return {
    questions: [
      { question: "Tell me about yourself.", category: "behavioral", framework: "30 seconds: present role + 30s: relevant past + 30s: why this role." },
      { question: "Walk me through a challenging technical decision you made recently.", category: "technical", framework: "Use STAR: explain context, trade-offs you weighed, decision criteria, and outcome." },
      { question: "Why are you interested in this company?", category: "company", framework: "Reference 2-3 specific things: their product, mission, recent news, or tech." },
      { question: "Describe a time you disagreed with a teammate.", category: "behavioral", framework: "Show you can disagree without being disagreeable. Focus on the outcome and learning." },
      { question: "How do you handle competing priorities?", category: "behavioral", framework: "Talk about your prioritization framework (impact vs effort, stakeholder alignment)." },
      { question: "Explain a system you designed.", category: "technical", framework: "Cover requirements → high-level design → trade-offs → bottlenecks → scaling." },
      { question: "Why are you leaving your current role?", category: "experience", framework: "Future-focused, avoid badmouthing. Frame it as seeking new growth." },
      { question: "What questions do you have for us?", category: "company", framework: "Always have 3+ ready: about the team, the role's success metrics, and the company's direction." },
    ],
  };
}

// ═══════════════════════════════════════════════════════════════
// 5g. Application Email Drafter
// ═══════════════════════════════════════════════════════════════

export async function draftApplicationEmail(
  ctx: ServiceContext,
  job: { title: string; company: string; description: string },
  profile: ParsedProfile,
  recipient: { name?: string | null; email?: string | null; role?: string },
  tone: EmailTone = "formal"
): Promise<string> {
  if (ctx.settings?.email_draft_enabled === false) return stubEmail(job, recipient, tone);

  const prompt = `Draft a cold outreach email to ${recipient.role ?? "a recruiter"} for this job.

TONE: ${tone === "formal" ? "Professional, respectful" : "Friendly, conversational, brief"}

RECIPIENT: ${recipient.name ?? "Hiring Manager"}${recipient.email ? ` (${recipient.email})` : ""}

JOB: ${job.title} at ${job.company}
${job.description.slice(0, 800)}

CANDIDATE HIGHLIGHTS:
${profileSummary(profile)}

Requirements:
- Subject line included (format: "Subject: ...")
- Under 200 words
- Specific reason for interest in THIS role
- Mention 1-2 specific qualifications
- Clear ask (15-min chat, application referral, etc.)
- Sign-off

Return only the email with subject line.`;

  const text = await callClaude(ctx, prompt, { maxTokens: 700 });
  if (!text) return stubEmail(job, recipient, tone);
  return text.trim();
}

function stubEmail(job: { title: string; company: string }, recipient: { name?: string | null }, tone: EmailTone): string {
  const greeting = tone === "formal" ? `Dear ${recipient.name ?? "Hiring Manager"}` : `Hi ${recipient.name ?? "there"}`;
  return `Subject: Interest in the ${job.title} role at ${job.company}

${greeting},

I came across the ${job.title} opening at ${job.company} and was immediately drawn to it. My background in software engineering aligns closely with what you're looking for.

I'd love a brief 15-minute chat to learn more about the team and share how my experience could help. Would you have time this or next week?

Thanks for considering,
[Your Name]

— (Demo mode: enable AI for personalized outreach)`;
}

// ═══════════════════════════════════════════════════════════════
// 5h. LinkedIn Profile Analyzer
// ═══════════════════════════════════════════════════════════════

export async function analyzeLinkedIn(
  ctx: ServiceContext,
  about: string,
  experience: string
): Promise<LinkedInAnalysis> {
  if (ctx.settings?.linkedin_analyzer_enabled === false) return stubLinkedIn();

  const prompt = `Analyze this LinkedIn profile content and return structured feedback.

Return ONLY JSON:
{
  "overallScore": <0-100>,
  "headline": "<suggested profile headline/tagline for this person>",
  "strengths": ["strength 1", "strength 2", "strength 3"],
  "improvements": ["improvement 1", "improvement 2", "improvement 3"],
  "keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5"],
  "rewrittenAbout": "<full rewritten About section optimized for recruiter visibility>"
}

ABOUT SECTION:
${about.slice(0, 1500)}

EXPERIENCE:
${experience.slice(0, 2000)}

Score guide: 80-100 excellent, 60-79 good, 40-59 needs work, <40 significant gaps.`;

  const text = await callClaude(ctx, prompt, { maxTokens: 1800 });
  if (!text) return stubLinkedIn();

  return parseJsonResponse<LinkedInAnalysis>(text, stubLinkedIn());
}

function stubLinkedIn(): LinkedInAnalysis {
  return {
    overallScore: 72,
    headline: "Software Engineer | Full-Stack | React · TypeScript · Node.js | Open to Opportunities",
    strengths: [
      "Clear professional background and progression",
      "Technical skills are visible and relevant",
      "Good use of first person and active voice",
    ],
    improvements: [
      "Add measurable achievements (e.g., 'reduced load time by 40%')",
      "Include more industry keywords recruiters search for",
      "Expand experience section with project details",
    ],
    keywords: ["TypeScript", "System Design", "CI/CD", "API Development", "Cloud Infrastructure"],
    rewrittenAbout: "Senior software engineer with 5+ years building scalable web applications at high-growth startups. Specialized in React, TypeScript, and Node.js — with a track record of delivering features that move key metrics. I thrive in fast-moving teams where craft and velocity go hand in hand.\n\nRecent highlights: shipped a real-time analytics dashboard used by 10k+ users, led a backend migration reducing API latency by 60%, and mentored 3 engineers through their first production deployments.\n\nCurrently exploring senior IC and tech lead opportunities at product-focused companies.\n\n(Demo mode — enable AI for a personalized rewrite of your actual profile)",
  };
}

// ═══════════════════════════════════════════════════════════════
// 5i. Job Market Trend Summarizer
// ═══════════════════════════════════════════════════════════════

export async function summarizeMarket(
  ctx: ServiceContext,
  targetRole: string,
  location: string,
  recentJobs: Array<{ title: string; salary_min?: number | null; salary_max?: number | null; company: string; description?: string }>
): Promise<MarketPulse> {
  if (ctx.settings?.market_pulse_enabled === false) return stubMarketPulse(targetRole);

  // Aggregate: don't send raw dump
  const companyCount = new Map<string, number>();
  let salaryTotal = 0;
  let salaryCount = 0;
  const titleWords = new Map<string, number>();

  for (const job of recentJobs.slice(0, 50)) {
    companyCount.set(job.company, (companyCount.get(job.company) ?? 0) + 1);
    if (job.salary_min) { salaryTotal += job.salary_min; salaryCount++; }
    if (job.salary_max) { salaryTotal += job.salary_max; salaryCount++; }
    for (const word of job.title.split(/\s+/)) {
      if (word.length > 3) titleWords.set(word, (titleWords.get(word) ?? 0) + 1);
    }
  }

  const topCompanies = Array.from(companyCount.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c]) => c);
  const avgSalary = salaryCount > 0 ? Math.round(salaryTotal / salaryCount) : null;
  const trendingWords = Array.from(titleWords.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([w]) => w);

  const prompt = `Write a weekly job market pulse for ${targetRole} in ${location}.

AGGREGATE DATA (last week, ${recentJobs.length} jobs):
- Top hiring companies: ${topCompanies.join(", ")}
- Average salary: ${avgSalary ? `$${avgSalary.toLocaleString()}` : "unknown"}
- Trending title keywords: ${trendingWords.join(", ")}

Return ONLY JSON:
{
  "summary": "<2-3 sentences summarizing current market conditions>",
  "hotSkills": ["skill1", "skill2", "skill3", "skill4", "skill5"],
  "salaryRange": "<e.g. $130k–$180k>",
  "insight": "<one key actionable insight for job seekers>",
  "topCompanies": ["company1", "company2", "company3"]
}`;

  const text = await callClaude(ctx, prompt, { maxTokens: 700 });
  if (!text) return stubMarketPulse(targetRole, topCompanies, avgSalary);

  const parsed = parseJsonResponse<Partial<MarketPulse>>(text, {});
  return {
    summary: parsed.summary ?? "",
    hotSkills: parsed.hotSkills ?? [],
    salaryRange: parsed.salaryRange ?? (avgSalary ? `~$${avgSalary.toLocaleString()}` : ""),
    insight: parsed.insight ?? "",
    topCompanies: parsed.topCompanies ?? topCompanies,
    generatedAt: new Date().toISOString(),
  };
}

function stubMarketPulse(role: string, companies: string[] = [], avgSalary: number | null = null): MarketPulse {
  return {
    summary: `The ${role} market remains competitive, with strong demand from AI-first startups and large tech companies expanding their engineering teams.`,
    hotSkills: ["TypeScript", "React", "Cloud (AWS/GCP)", "System Design", "AI/ML"],
    salaryRange: avgSalary ? `~$${Math.round(avgSalary * 0.8).toLocaleString()}–$${Math.round(avgSalary * 1.2).toLocaleString()}` : "$130k–$190k",
    insight: "Focus on demonstrating AI/ML integration experience — even at the application layer — as this is rapidly becoming a baseline requirement.",
    topCompanies: companies.length > 0 ? companies : ["Stripe", "Linear", "Vercel", "Anthropic", "OpenAI", "Notion"],
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
// 5j. Rejection Pattern Analyzer
// ═══════════════════════════════════════════════════════════════

export async function analyzeRejections(
  ctx: ServiceContext,
  rejectedJobs: Array<{ title: string; company: string; description?: string; seniority?: string | null }>
): Promise<RejectionPattern> {
  const count = rejectedJobs.length;
  if (count < 5 || ctx.settings?.rejection_analyzer_enabled === false) {
    return { patterns: [], recommendations: [], rejectionCount: count };
  }

  // Aggregate
  const seniorityCount = new Map<string, number>();
  const titleWords = new Map<string, number>();
  for (const job of rejectedJobs) {
    if (job.seniority) seniorityCount.set(job.seniority, (seniorityCount.get(job.seniority) ?? 0) + 1);
    for (const word of job.title.toLowerCase().split(/\s+/)) {
      if (word.length > 3) titleWords.set(word, (titleWords.get(word) ?? 0) + 1);
    }
  }

  const topSeniority = Array.from(seniorityCount.entries()).sort((a, b) => b[1] - a[1])[0];
  const topWords = Array.from(titleWords.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const prompt = `Analyze patterns in these ${count} rejected applications.

AGGREGATE:
- Seniority distribution: ${Array.from(seniorityCount.entries()).map(([s, n]) => `${s}: ${n}`).join(", ")}
- Most common title keywords: ${topWords.map(([w, n]) => `"${w}" (${n})`).join(", ")}

Sample titles (first 10): ${rejectedJobs.slice(0, 10).map((j) => `"${j.title}" at ${j.company}`).join("; ")}

Return ONLY JSON:
{
  "patterns": ["pattern 1", "pattern 2", "pattern 3"],
  "recommendations": ["actionable step 1", "actionable step 2", "actionable step 3"],
  "overallInsight": "<one sentence overall assessment>"
}

Be specific and actionable.`;

  const text = await callClaude(ctx, prompt, { maxTokens: 600 });
  const parsed = parseJsonResponse<{ patterns?: string[]; recommendations?: string[]; overallInsight?: string }>(text, {});
  return {
    patterns: parsed.patterns ?? [`Most rejections cluster at ${topSeniority?.[0] ?? "similar"} level roles`],
    recommendations: parsed.recommendations ?? ["Consider broadening your search criteria"],
    overallInsight: parsed.overallInsight,
    rejectionCount: count,
  };
}

// ─── Test Connection ──────────────────────────────────────────

export async function testConnection(apiKey: string): Promise<{ ok: boolean; error?: string }> {
  if (!apiKey || !apiKey.startsWith("sk-")) {
    return { ok: false, error: "Invalid key format (should start with 'sk-')" };
  }
  if (STUB_MODE) return { ok: true };
  const client = new Anthropic({ apiKey });
  try {
    await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: 10,
      messages: [{ role: "user", content: "Reply with just 'ok'." }],
    });
    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { ok: false, error: message };
  }
}

// ─── Batch Scoring ────────────────────────────────────────────

export async function batchScoreJobs(
  ctx: ServiceContext,
  jobs: Array<{ id: string; title: string; company: string; description: string; requirements?: string | null }>,
  profile: ParsedProfile
): Promise<Map<string, MatchResult>> {
  const results = new Map<string, MatchResult>();
  const batchSize = 3;
  for (let i = 0; i < jobs.length; i += batchSize) {
    const batch = jobs.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map((job) => scoreJob(ctx, job, profile).then((r) => ({ id: job.id, r })))
    );
    for (const settled of batchResults) {
      if (settled.status === "fulfilled") results.set(settled.value.id, settled.value.r);
    }
    if (i + batchSize < jobs.length) {
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
  }
  return results;
}

// ─── Resume Parsing (used by resumeParser.ts) ────────────────

export async function parseResumeWithAI(
  ctx: ServiceContext,
  rawText: string
): Promise<ParsedProfile> {
  const prompt = `You are an expert resume parser. Extract structured data.

Return ONLY JSON:
{
  "skills": ["..."] (max 30),
  "titles": ["..."] (max 10),
  "experienceYears": <number>,
  "education": [{ "degree": "...", "field": "...", "school": "..." }],
  "location": "<or null>",
  "desiredRole": "<or null>",
  "summary": "<2-3 sentence summary>"
}

Resume:
---
${rawText.slice(0, 8000)}
---`;

  const text = await callClaude(ctx, prompt, { maxTokens: 1500, model: POWERFUL_MODEL });
  if (!text) {
    // Stub fallback: very basic extraction
    return stubResumeParse(rawText);
  }

  const parsed = parseJsonResponse<{
    skills?: string[]; titles?: string[]; experienceYears?: number;
    education?: { degree?: string; field?: string; school?: string }[];
    location?: string; desiredRole?: string; summary?: string;
  }>(text, {});

  return {
    rawText,
    skills: Array.isArray(parsed.skills) ? parsed.skills : [],
    titles: Array.isArray(parsed.titles) ? parsed.titles : [],
    experienceYears: typeof parsed.experienceYears === "number" ? parsed.experienceYears : 0,
    education: Array.isArray(parsed.education) ? parsed.education : [],
    location: parsed.location ?? undefined,
    desiredRole: parsed.desiredRole ?? undefined,
    summary: parsed.summary ?? undefined,
  };
}

function stubResumeParse(rawText: string): ParsedProfile {
  // Naive extraction so demo mode still works
  const skillsRegex = /(JavaScript|TypeScript|Python|Java|React|Vue|Angular|Node|AWS|GCP|Azure|Docker|Kubernetes|SQL|PostgreSQL|MongoDB|GraphQL|REST|Git|HTML|CSS|Tailwind)/gi;
  const skillSet = new Set<string>();
  let match;
  while ((match = skillsRegex.exec(rawText)) !== null) skillSet.add(match[1]);

  return {
    rawText,
    skills: Array.from(skillSet).slice(0, 20),
    titles: ["Software Engineer"],
    experienceYears: 3,
    education: [],
    summary: "Resume parsed in demo mode. Enable AI in settings for full extraction.",
  };
}

// ═══════════════════════════════════════════════════════════════
// ATS Score Checker
// ═══════════════════════════════════════════════════════════════

export async function scoreATS(
  ctx: ServiceContext,
  resumeText: string,
  jobDescription: string
): Promise<ATSScore> {
  const prompt = `You are an expert ATS (Applicant Tracking System) analyst. Score how well this resume would perform when parsed by an ATS for this job description.

ATS systems scan for: exact keyword matches, skills alignment, experience level, education requirements, and resume format/structure.

RESUME:
---
${resumeText.slice(0, 4000)}
---

JOB DESCRIPTION:
---
${jobDescription.slice(0, 3000)}
---

Return ONLY valid JSON matching this exact schema:
{
  "overallScore": <0-100>,
  "keywordScore": <0-100>,
  "skillsScore": <0-100>,
  "experienceScore": <0-100>,
  "formatScore": <0-100>,
  "matchedKeywords": ["exact keywords/phrases from JD that appear in resume"],
  "missingKeywords": ["important keywords from JD missing from resume"],
  "suggestions": [
    { "priority": "high|medium|low", "text": "specific actionable improvement" }
  ],
  "sectionScores": [
    { "section": "Work Experience", "score": <0-100>, "feedback": "brief feedback" },
    { "section": "Skills", "score": <0-100>, "feedback": "brief feedback" },
    { "section": "Education", "score": <0-100>, "feedback": "brief feedback" },
    { "section": "Summary/Objective", "score": <0-100>, "feedback": "brief feedback" }
  ],
  "summary": "<2-3 sentences summarising the ATS compatibility and top priority fix>"
}

Scoring guide:
- keywordScore: % of critical JD keywords found in resume (exact + close variants)
- skillsScore: alignment of listed skills with required/preferred skills
- experienceScore: years/level match, relevant role titles, industry overlap
- formatScore: ATS-friendly structure (no tables/graphics in text, clear sections, standard headings)
- overallScore: weighted average (keywords 35%, skills 30%, experience 25%, format 10%)

Be precise and realistic. Missing a required keyword should significantly hurt keywordScore.`;

  const text = await callClaude(ctx, prompt, { maxTokens: 2000, model: POWERFUL_MODEL });
  if (!text) return stubATSScore();

  return parseJsonResponse<ATSScore>(text, stubATSScore());
}

function stubATSScore(): ATSScore {
  return {
    overallScore: 68,
    keywordScore: 62,
    skillsScore: 75,
    experienceScore: 70,
    formatScore: 80,
    matchedKeywords: ["React", "TypeScript", "Node.js", "REST API", "Agile", "Git"],
    missingKeywords: ["Kubernetes", "GraphQL", "AWS Lambda", "CI/CD pipelines", "microservices"],
    suggestions: [
      { priority: "high", text: "Add 'Kubernetes' and 'AWS Lambda' to your skills section — these appear 4+ times in the JD." },
      { priority: "high", text: "Mention 'microservices architecture' explicitly; the JD requires this experience." },
      { priority: "medium", text: "Add quantified achievements: include % improvements, team sizes, and revenue impact." },
      { priority: "medium", text: "Use 'CI/CD' explicitly rather than just listing tools — ATS scans for the term." },
      { priority: "low", text: "Add a 2-3 sentence professional summary at the top targeting this role." },
    ],
    sectionScores: [
      { section: "Work Experience", score: 70, feedback: "Good progression but lacks measurable outcomes and some required tech keywords." },
      { section: "Skills", score: 75, feedback: "Core skills present; missing cloud-native and DevOps keywords required by JD." },
      { section: "Education", score: 90, feedback: "Meets requirements." },
      { section: "Summary/Objective", score: 40, feedback: "No summary section — add one tailored to this role for a significant ATS boost." },
    ],
    summary: "Your resume scores 68/100 for ATS compatibility. The main gaps are missing cloud/DevOps keywords (Kubernetes, AWS Lambda, microservices) that appear repeatedly in the JD. Adding a targeted summary and these keywords could push your score above 80. (Demo mode — enable AI for real analysis.)",
  };
}
