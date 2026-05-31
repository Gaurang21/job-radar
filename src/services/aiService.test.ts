/**
 * Tests for AI service in stub mode (AI_STUB_MODE=true).
 * These run without any network calls and verify stub contracts.
 */
import { describe, it, expect, beforeAll } from "vitest";

// Force stub mode before importing the service
beforeAll(() => {
  process.env.AI_STUB_MODE = "true";
});

// Dynamically import after env is set
const getService = () => import("./aiService");

const stubCtx = { apiKey: null };
const stubProfile = {
  rawText: "Jane Doe, Software Engineer, 5 years React TypeScript Node.js",
  skills: ["React", "TypeScript", "Node.js"],
  titles: ["Software Engineer"],
  experienceYears: 5,
  education: [{ degree: "BS", field: "Computer Science", school: "State U" }],
};
const stubJob = {
  id: "job-1",
  title: "Senior Frontend Engineer",
  company: "Acme Corp",
  description: "We need React TypeScript experience. 3+ years required.",
};

describe("scoreJob (stub)", () => {
  it("returns a score between 0 and 100", async () => {
    const { scoreJob } = await getService();
    const result = await scoreJob(stubCtx, stubJob, stubProfile);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns at least one reason", async () => {
    const { scoreJob } = await getService();
    const result = await scoreJob(stubCtx, stubJob, stubProfile);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it("returns a non-empty whyMatch string", async () => {
    const { scoreJob } = await getService();
    const result = await scoreJob(stubCtx, stubJob, stubProfile);
    expect(result.whyMatch).toBeTruthy();
  });
});

describe("generateCoverLetter (stub)", () => {
  it("returns a non-empty string", async () => {
    const { generateCoverLetter } = await getService();
    const letter = await generateCoverLetter(stubCtx, stubJob, stubProfile, "formal");
    expect(typeof letter).toBe("string");
    expect(letter.length).toBeGreaterThan(50);
  });
});

describe("generateInterviewPrep (stub)", () => {
  it("returns 8+ questions", async () => {
    const { generateInterviewPrep } = await getService();
    const result = await generateInterviewPrep(stubCtx, stubJob, stubProfile);
    expect(result.questions.length).toBeGreaterThanOrEqual(8);
  });

  it("each question has required fields", async () => {
    const { generateInterviewPrep } = await getService();
    const result = await generateInterviewPrep(stubCtx, stubJob, stubProfile);
    for (const q of result.questions) {
      expect(q.question).toBeTruthy();
      expect(["behavioral", "technical", "experience", "company"]).toContain(q.category);
      expect(q.framework).toBeTruthy();
    }
  });
});

describe("scoreATS (stub)", () => {
  it("returns an overall score between 0 and 100", async () => {
    const { scoreATS } = await getService();
    const result = await scoreATS(
      stubCtx,
      stubProfile.rawText,
      "Looking for a React TypeScript developer with 3+ years experience."
    );
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(100);
  });

  it("returns matched and missing keywords arrays", async () => {
    const { scoreATS } = await getService();
    const result = await scoreATS(stubCtx, stubProfile.rawText, "React developer needed");
    expect(Array.isArray(result.matchedKeywords)).toBe(true);
    expect(Array.isArray(result.missingKeywords)).toBe(true);
  });

  it("returns suggestions with priority fields", async () => {
    const { scoreATS } = await getService();
    const result = await scoreATS(stubCtx, stubProfile.rawText, "Senior engineer role");
    for (const s of result.suggestions) {
      expect(["high", "medium", "low"]).toContain(s.priority);
      expect(s.text).toBeTruthy();
    }
  });

  it("returns 4 section scores", async () => {
    const { scoreATS } = await getService();
    const result = await scoreATS(stubCtx, stubProfile.rawText, "Engineering role");
    expect(result.sectionScores.length).toBe(4);
  });
});

describe("detectSkillGaps (stub)", () => {
  it("returns matched/transferable/missing arrays", async () => {
    const { detectSkillGaps } = await getService();
    const result = await detectSkillGaps(stubCtx, stubJob, stubProfile);
    expect(Array.isArray(result.matched)).toBe(true);
    expect(Array.isArray(result.transferable)).toBe(true);
    expect(Array.isArray(result.missing)).toBe(true);
  });
});

describe("testConnection", () => {
  it("returns ok=true in stub mode (any key format)", async () => {
    const { testConnection } = await getService();
    const result = await testConnection("sk-ant-test-key");
    expect(result.ok).toBe(true);
  });

  it("returns ok=false for invalid key format", async () => {
    const { testConnection } = await getService();
    const result = await testConnection("invalid-key");
    expect(result.ok).toBe(false);
  });
});
