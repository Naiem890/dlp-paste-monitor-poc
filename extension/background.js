"use strict";

/*
 * Zero-Retention Clipboard Evaluation Service Worker
 *
 * This background script handles clipboard read requests from the content script.
 * It uses the Async Clipboard API (navigator.clipboard.readText) which requires
 * the "clipboardRead" permission declared in manifest.json.
 *
 * ZERO-RETENTION COMPLIANCE:
 * - Clipboard data is processed in-memory only
 * - Data is passed to the triage worker for evaluation, then immediately discarded
 * - No clipboard data is written to storage, IndexedDB, localStorage, or any persistent store
 * - No clipboard data is logged to console in production
 * - The variable holding clipboard text is scoped to the message handler and garbage collected
 */

var WORKER_URL = "https://dlp-triage-worker.solaiman-naiem890.workers.dev/evaluate";

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type !== "EVALUATE_PASTE") return false;

  var pastedText = message.pastedText || "";
  var destinationUrl = message.destinationUrl || "";

  if (!pastedText) {
    sendResponse({ risk: null, error: "empty" });
    return false;
  }

  fetch(WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pastedText: pastedText,
      destinationUrl: destinationUrl,
    }),
  })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      sendResponse(data);
    })
    .catch(function () {
      sendResponse({ risk: null, error: "unreachable" });
    });

  return true; // keep message channel open for async sendResponse
});
