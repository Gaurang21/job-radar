// JobRadar Popup Script
"use strict";

const JOB_SITE_PATTERNS = [
  /linkedin\.com\/jobs/,
  /indeed\.com\/(viewjob|jobs)/,
  /greenhouse\.io\/jobs/,
  /jobs\.lever\.co/,
  /glassdoor\.com\/job-listing/,
  /workday\.com/,
];

let serverUrl = "http://localhost:3000";

// ── Init ──────────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", async () => {
  // Load saved server URL
  const stored = await chrome.storage.local.get("serverUrl");
  if (stored.serverUrl) {
    serverUrl = stored.serverUrl;
  }

  const urlInput = document.getElementById("serverUrl");
  urlInput.value = serverUrl;
  document.getElementById("serverLabel").textContent = serverUrl.replace("http://", "").replace("https://", "");
  document.getElementById("openApp").href = serverUrl;

  urlInput.addEventListener("change", async () => {
    serverUrl = urlInput.value.trim().replace(/\/$/, "");
    await chrome.storage.local.set({ serverUrl });
    document.getElementById("serverLabel").textContent = serverUrl.replace("http://", "").replace("https://", "");
    document.getElementById("openApp").href = serverUrl;
    checkServer();
  });

  // Check server health + load stats
  await checkServer();
  await loadStats();

  // Check current tab for job page
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.url) checkJobPage(tab);

  // Save button
  document.getElementById("saveBtn").addEventListener("click", () => saveCurrentJob(tab));
});

// ── Server Check ──────────────────────────────────────────────

async function checkServer() {
  const dot = document.getElementById("statusDot");
  try {
    const res = await fetch(`${serverUrl}/api/dashboard`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      dot.classList.add("online");
    } else {
      dot.classList.remove("online");
    }
  } catch {
    dot.classList.remove("online");
  }
}

// ── Load Stats ────────────────────────────────────────────────

async function loadStats() {
  try {
    const res = await fetch(`${serverUrl}/api/dashboard`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById("totalJobs").textContent = data.totalJobs ?? "—";
    document.getElementById("applied").textContent = data.applied ?? "—";
    document.getElementById("interviews").textContent = data.interviews ?? "—";
  } catch {
    // Server offline
  }
}

// ── Job Page Detection ────────────────────────────────────────

function checkJobPage(tab) {
  const isJobPage = JOB_SITE_PATTERNS.some((p) => p.test(tab.url));

  if (isJobPage) {
    document.getElementById("currentJobSection").style.display = "block";
    document.getElementById("notJobPage").style.display = "none";

    // Get job details from content script
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: getJobDetails,
    }, (results) => {
      if (chrome.runtime.lastError || !results?.[0]?.result) return;
      const job = results[0].result;
      document.getElementById("jobTitle").textContent = job.title || "Unknown Title";
      document.getElementById("jobCompany").textContent = job.company || "";
    });
  } else {
    document.getElementById("currentJobSection").style.display = "none";
    document.getElementById("notJobPage").style.display = "block";
  }
}

function getJobDetails() {
  // This runs in the page context
  const selectors = {
    title: [
      ".job-details-jobs-unified-top-card__job-title h1",
      ".jobs-unified-top-card__job-title",
      '[data-testid="jobsearch-JobInfoHeader-title"]',
      "h1.app-title",
      "h1",
    ],
    company: [
      ".job-details-jobs-unified-top-card__company-name a",
      '[data-testid="inlineHeader-companyName"]',
      ".company-name",
    ],
  };

  function trySelectors(list) {
    for (const sel of list) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) return el.textContent.trim();
    }
    return "";
  }

  return {
    title: trySelectors(selectors.title),
    company: trySelectors(selectors.company),
    url: window.location.href,
  };
}

// ── Save Job ──────────────────────────────────────────────────

async function saveCurrentJob(tab) {
  const btn = document.getElementById("saveBtn");
  btn.disabled = true;
  btn.textContent = "Saving…";

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const getText = (selectors) => {
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el?.textContent?.trim()) return el.textContent.trim();
          }
          return "";
        };
        return {
          title: getText([
            ".job-details-jobs-unified-top-card__job-title h1",
            ".jobs-unified-top-card__job-title",
            '[data-testid="jobsearch-JobInfoHeader-title"]',
            "h1.app-title",
            "h1",
          ]),
          company: getText([
            ".job-details-jobs-unified-top-card__company-name a",
            '[data-testid="inlineHeader-companyName"]',
            ".company-name",
          ]),
          location: getText([
            ".job-details-jobs-unified-top-card__bullet",
            '[data-testid="job-location"]',
            ".location",
          ]),
          description: (document.querySelector("#jobDescriptionText") || document.querySelector(".jobs-description__content") || document.body).innerText.slice(0, 2000),
          url: window.location.href,
        };
      },
    });

    const job = results?.[0]?.result;
    if (!job?.title) throw new Error("Could not detect job details");

    const res = await fetch(`${serverUrl}/api/extension/save-job`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(job),
    });

    const data = await res.json();
    if (data.success) {
      btn.textContent = "✓ Saved!";
      btn.classList.add("saved");
      setTimeout(() => {
        btn.textContent = "Save to Pipeline";
        btn.classList.remove("saved");
        btn.disabled = false;
      }, 2000);
    } else {
      throw new Error(data.error || "Save failed");
    }
  } catch (err) {
    btn.textContent = "⚠️ Failed — is JobRadar running?";
    btn.disabled = false;
    setTimeout(() => { btn.textContent = "Save to Pipeline"; }, 2500);
  }
}
