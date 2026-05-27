import type { ParsedProfile } from "@/types";
import { parseResumeWithAI } from "./aiService";

// ─── File Text Extraction ─────────────────────────────────────

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default;
  const data = await pdfParse(buffer);
  return data.text;
}

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

export async function extractResumeText(buffer: Buffer, mimeType: string): Promise<string> {
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
  return buffer.toString("utf-8");
}

export async function parseResume(
  buffer: Buffer,
  mimeType: string,
  ctx: { apiKey?: string | null }
): Promise<ParsedProfile> {
  const rawText = await extractResumeText(buffer, mimeType);
  if (!rawText || rawText.trim().length < 50) {
    throw new Error("Could not extract meaningful text from resume. Check the file format.");
  }
  return parseResumeWithAI(ctx, rawText);
}
