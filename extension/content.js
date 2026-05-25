// JobRadar Content Script
// Detects job listing pages and injects a "Save to JobRadar" floating button

(function () {
  "use strict";

  const JOBSITE_PATTERNS = {
    linkedin: {
      matches: /linkedin\.com\/jobs/,
      getTitle: () =>
        document.querySelector(".job-details-jobs-unified-top-card__job-title h1")?.textContent?.trim() ||
        document.querySelector(".jobs-unified-top-card__job-title")?.textContent?.trim() || "",
      getCompany: () =>
        document.querySelector(".job-details-jobs-unified-top-card__company-name a")?.textContent?.trim() ||
        document.querySelector(".jobs-unified-top-card__company-name")?.textContent?.trim() || "",
      getLocation: () =>
        document.querySelector(".job-details-jobs-unified-top-card__bullet")?.textContent?.trim() || "",
      getDescription: () =>
        document.querySelector(".jobs-description__content")?.textContent?.trim() ||
        document.querySelector(".job-view-layout")?.textContent?.trim() || "",
    },
    indeed: {
      matches: /indeed\.com\/(viewjob|jobs)/,
      getTitle: () =>
        document.querySelector('[data-testid="jobsearch-JobInfoHeader-title"]')?.textContent?.trim() ||
        document.querySelector(".jobsearch-JobInfoHeader-title")?.textContent?.trim() || "",
      getCompany: () =>
        document.querySelector('[data-testid="inlineHeader-companyName"]')?.textContent?.trim() ||
        document.querySelector(".jobsearch-InlineCompanyRating-companyHeader")?.textContent?.trim() || "",
      getLocation: () =>
        document.querySelector('[data-testid="job-location"]')?.textContent?.trim() || "",
      getDescription: () =>
        document.querySelector("#jobDescriptionText")?.textContent?.trim() || "",
    },
    greenhouse: {
      matches: /greenhouse\.io\/jobs/,
      getTitle: () => document.querySelector("h1.app-title")?.textContent?.trim() || document.querySelector("h1")?.textContent?.trim() || "",
      getCompany: () => document.querySelector(".company-name")?.textContent?.trim() || document.title.split(" at ")[1] || "",
      getLocation: () => document.querySelector(".location")?.textContent?.trim() || "",
      getDescription: () => document.querySelector("#content")?.textContent?.trim() || "",
    },
    lever: {
      matches: /jobs\.lever\.co/,
      getTitle: () => document.querySelector("h2")?.textContent?.trim() || "",
      getCompany: () => window.location.hostname.replace("jobs.lever.co/", "").split("/")[1] || "",
      getLocation: () => document.querySelector(".location")?.textContent?.trim() || "",
      getDescription: () => document.querySelector(".section-wrapper")?.textContent?.trim() || "",
    },
    glassdoor: {
      matches: /glassdoor\.com\/job-listing/,
      getTitle: () => document.querySelector('[data-test="job-title"]')?.textContent?.trim() || "",
      getCompany: () => document.querySelector('[data-test="employer-name"]')?.textContent?.trim() || "",
      getLocation: () => document.querySelector('[data-test="job-location"]')?.textContent?.trim() || "",
      getDescription: () => document.querySelector("[class*='desc']")?.textContent?.trim() || "",
    },
  };

  // Detect current site
  const currentUrl = window.location.href;
  const site = Object.values(JOBSITE_PATTERNS).find((p) => p.matches.test(currentUrl));
  if (!site) return;

  // Get JobRadar server URL from storage (default: localhost:3000)
  let serverUrl = "http://localhost:3000";

  // Inject floating button
  function injectButton() {
    if (document.getElementById("jobradar-save-btn")) return;

    const btn = document.createElement("button");
    btn.id = "jobradar-save-btn";
    btn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="9"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="8" y1="12" x2="16" y2="12"/>
      </svg>
      <span>Save to JobRadar</span>
    `;

    Object.assign(btn.style, {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      zIndex: "999999",
      display: "flex",
      alignItems: "center",
      gap: "8px",
      padding: "10px 18px",
      background: "linear-gradient(135deg, #06b6d4, #0891b2)",
      color: "white",
      border: "none",
      borderRadius: "50px",
      fontSize: "13px",
      fontWeight: "600",
      fontFamily: "system-ui, sans-serif",
      cursor: "pointer",
      boxShadow: "0 4px 20px rgba(6, 182, 212, 0.5)",
      transition: "all 0.2s ease",
      outline: "none",
    });

    btn.onmouseenter = () => {
      btn.style.transform = "translateY(-2px)";
      btn.style.boxShadow = "0 6px 24px rgba(6, 182, 212, 0.6)";
    };
    btn.onmouseleave = () => {
      btn.style.transform = "";
      btn.style.boxShadow = "0 4px 20px rgba(6, 182, 212, 0.5)";
    };

    btn.onclick = saveJob;
    document.body.appendChild(btn);
  }

  async function saveJob() {
    const btn = document.getElementById("jobradar-save-btn");
    if (!btn) return;

    const title = site.getTitle();
    const company = site.getCompany();
    if (!title) {
      showToast("❌ Could not detect job title on this page", "error");
      return;
    }

    // Loading state
    btn.innerHTML = `<svg class="jobradar-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg><span>Saving…</span>`;
    btn.style.pointerEvents = "none";

    try {
      const res = await fetch(`${serverUrl}/api/extension/save-job`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          company: company || "Unknown",
          location: site.getLocation(),
          description: site.getDescription().slice(0, 3000),
          url: window.location.href,
        }),
      });

      const data = await res.json();
      if (data.success) {
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          <span>Saved to JobRadar!</span>
        `;
        btn.style.background = "linear-gradient(135deg, #10b981, #059669)";
        showToast("✅ Saved to JobRadar pipeline!", "success");
        setTimeout(() => injectButton(), 3000);
      } else {
        throw new Error(data.error || "Save failed");
      }
    } catch (err) {
      btn.innerHTML = `<span>⚠️ Couldn't connect to JobRadar</span>`;
      btn.style.background = "linear-gradient(135deg, #ef4444, #dc2626)";
      btn.style.pointerEvents = "auto";
      showToast("⚠️ Make sure JobRadar is running at " + serverUrl, "error");
      setTimeout(() => injectButton(), 3000);
    }
  }

  function showToast(message, type) {
    const toast = document.createElement("div");
    toast.textContent = message;
    Object.assign(toast.style, {
      position: "fixed",
      bottom: "80px",
      right: "24px",
      zIndex: "999999",
      padding: "10px 16px",
      borderRadius: "10px",
      fontSize: "13px",
      fontFamily: "system-ui, sans-serif",
      fontWeight: "500",
      color: "white",
      background: type === "success" ? "#0c1527" : "#1a0a0a",
      border: `1px solid ${type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
      boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
      animation: "jobradar-fadein 0.3s ease",
    });
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // Add spin animation
  const style = document.createElement("style");
  style.textContent = `
    @keyframes jobradar-spin { to { transform: rotate(360deg); } }
    .jobradar-spin { animation: jobradar-spin 0.8s linear infinite; }
    @keyframes jobradar-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  `;
  document.head.appendChild(style);

  // Inject button after page loads
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectButton);
  } else {
    setTimeout(injectButton, 1000);
  }

  // Re-inject on navigation (SPA support)
  const observer = new MutationObserver(() => {
    if (!document.getElementById("jobradar-save-btn")) {
      setTimeout(injectButton, 500);
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
})();
