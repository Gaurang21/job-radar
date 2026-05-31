import { test, expect } from "@playwright/test";

const JD = `
Senior Frontend Engineer — Acme Corp
Requirements:
- 4+ years of React and TypeScript experience
- Strong understanding of Kubernetes and AWS
- Experience with GraphQL and REST APIs
- CI/CD pipeline knowledge
- Agile/Scrum environment
`;

const RESUME = `
Jane Doe | jane@example.com
Senior Software Engineer — 5 years experience
Skills: React, TypeScript, Node.js, REST API, Git, Agile
Work: Built customer-facing dashboard with React, reduced load time by 40%.
Education: BS Computer Science
`;

test.describe("ATS Checker", () => {
  test.beforeEach(async ({ page }) => {
    // In E2E, auth is handled by test setup or we skip login for public pages
    // For now, navigate directly assuming test session is set up
    await page.goto("/ats-checker");
  });

  test("page loads with correct heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /ATS Score Checker/i })).toBeVisible();
  });

  test("shows empty state result placeholder", async ({ page }) => {
    await expect(page.getByText(/Your ATS score will appear here/i)).toBeVisible();
  });

  test("analyze button is disabled without job description", async ({ page }) => {
    const btn = page.getByRole("button", { name: /Check ATS Score/i });
    await expect(btn).toBeDisabled();
  });

  test("analyze button becomes enabled after pasting JD", async ({ page }) => {
    // Switch to paste mode in case there's a stored resume
    const pasteBtn = page.getByRole("button", { name: /Paste new/i });
    if (await pasteBtn.isVisible()) await pasteBtn.click();

    await page.getByPlaceholder(/Paste your complete resume/i).fill(RESUME);
    await page.getByPlaceholder(/Paste the full job description/i).fill(JD);

    const btn = page.getByRole("button", { name: /Check ATS Score/i });
    await expect(btn).toBeEnabled();
  });
});
