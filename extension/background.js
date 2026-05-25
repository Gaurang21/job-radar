// JobRadar Background Service Worker
"use strict";

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_SERVER_URL") {
    chrome.storage.local.get("serverUrl", (data) => {
      sendResponse({ serverUrl: data.serverUrl || "http://localhost:3000" });
    });
    return true; // Keep channel open for async response
  }
});

// Open app when extension icon is clicked (fallback if popup fails)
chrome.action.onClicked.addListener(() => {
  chrome.storage.local.get("serverUrl", (data) => {
    const url = data.serverUrl || "http://localhost:3000";
    chrome.tabs.create({ url });
  });
});
