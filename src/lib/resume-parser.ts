import Anthropic from "@anthropic-ai/sdk";
import type { ParsedProfile } from "@/types";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── File Text Extraction ─────────────────────────────────────

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Dynamic import to avoid SSR issues
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function extractResumeText(
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  if (mimeType === "application/pdf" || mimeType.includes("pdf")) {
    return extractTextFromPDF(buffer);
  }
  if (
    mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mimeType.includes("docx") ||
    mimeType.includes("word")
  ) {
    return extractTextFromDOCX(buffer);
  }
  // Plain text fallback
  return buffer.toString("utf-8");
}

// ─── Claude Resume Parsing ────────────────────────────────────

export async function parseResumeWithClaude(rawText: string): Promise<ParsedProfile> {
  const prompt = `You are an expert resume parser. Analyze this resume text and extract structured information.

Return ONLY valid JSON in exactly this format (no markdown, no extra text):
{
  "skills": ["skill1", "skill2", ...],
  "titles": ["Job Title 1", "Job Title 2", ...],
  "experienceYears": <number>,
  "education": [
    { "degree": "...", "field": "...", "school": "..." }
  ],
  "location": "<city, state/country or null>",
  "desiredRole": "<what role they're looking for or null>",
  "summary": "<2-3 sentence professional summary>"
}

Rules:
- skills: Extract ALL technical skills, tools, frameworks, languages, soft skills (max 30)
- titles: List job titles held, most recent first (max 10)
- experienceYears: Total years of professional experience (estimate if not explicit)
- education: All degrees/certifications mentioned
- location: Current or preferred location if mentioned
- desiredRole: Infer from context what role they want
- summary: Write a compelling professional summary

Resume text:
---
${rawText.slice(0, 8000)}
---`;

  const message = await anthropic.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1500,
    messages: [{ role: "user", content: prompt }],
  });

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  // Extract JSON from response (handle any extra whitespace)
  const jsonMatch = content.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Could not extract JSON from Claude response");
  }

  const parsed = JSON.parse(jsonMatch[0]);

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

// ─── Full Parse Pipeline ──────────────────────────────────────

export async function parseResume(
  buffer: Buffer,
  mimeType: string
): Promise<ParsedProfile> {
  const rawText = await extractResumeText(buffer, mimeType);
  if (!rawText || rawText.trim().length < 50) {
    throw new Error("Could not extract meaningful text from resume. Please check the file format.");
  }
  const profile = await parseResumeWithClaude(rawText);
  return profile;
}
