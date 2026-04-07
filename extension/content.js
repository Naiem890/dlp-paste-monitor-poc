"use strict";

(function () {
  var TOOLTIP_DISPLAY_MS = 3000;
  var FADE_OUT_MS = 250;
  var VIEWPORT_PADDING = 8;
  var TOOLTIP_OFFSET = 4;

  var RISK_COLORS = {
    "High Risk": "#ef4444",
    "Medium Risk": "#f59e0b",
    "Low Risk": "#3b82f6",
    "Safe": "#22c55e",
  };
  var DEFAULT_COLOR = "#a1a1aa";

  var TOOLTIP_CSS = [
    "@keyframes dlp-in { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }",
    "@keyframes dlp-out { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-3px); } }",
    ".dlp {",
    "  display: inline-flex;",
    "  align-items: center;",
    "  gap: 7px;",
    "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;",
    "  font-size: 12px;",
    "  font-weight: 500;",
    "  color: #e8e8e8;",
    "  background: rgba(24, 24, 27, 0.92);",
    "  backdrop-filter: blur(12px);",
    "  -webkit-backdrop-filter: blur(12px);",
    "  padding: 6px 12px;",
    "  border-radius: 6px;",
    "  box-shadow: 0 4px 12px rgba(0,0,0,0.3);",
    "  white-space: nowrap;",
    "  pointer-events: none;",
    "  line-height: 1;",
    "  animation: dlp-in 0.2s ease-out;",
    "}",
    ".dlp.out { animation: dlp-out 0.25s ease-in forwards; }",
    ".dot {",
    "  width: 6px;",
    "  height: 6px;",
    "  border-radius: 50%;",
    "  flex-shrink: 0;",
    "}",
  ].join("\n");

  var currentTooltip = null;

  // --- Positioning ---

  function getScrollOffset() {
    return { x: window.scrollX, y: window.scrollY };
  }

  function getTooltipPosition() {
    var active = document.activeElement;
    if (!active) return { top: 100, left: 100 };

    var tag = active.tagName;
    if (tag === "TEXTAREA" || tag === "INPUT") {
      return positionFromElement(active);
    }

    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      var rect = sel.getRangeAt(0).getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) {
        var scroll = getScrollOffset();
        return {
          top: rect.bottom + scroll.y + TOOLTIP_OFFSET,
          left: rect.left + scroll.x,
        };
      }
    }

    return positionFromElement(active);
  }

  function positionFromElement(el) {
    var rect = el.getBoundingClientRect();
    var scroll = getScrollOffset();
    return {
      top: rect.top + scroll.y - 30,
      left: rect.right + scroll.x - 180,
    };
  }

  function clampToViewport(host, pos) {
    var scroll = getScrollOffset();
    var hostRect = host.getBoundingClientRect();
    var h = hostRect.height || 28;
    var w = hostRect.width || 150;

    var maxTop = scroll.y + window.innerHeight - h - VIEWPORT_PADDING;
    var maxLeft = scroll.x + window.innerWidth - w - VIEWPORT_PADDING;
    var minTop = scroll.y + VIEWPORT_PADDING;
    var minLeft = scroll.x + VIEWPORT_PADDING;

    var top = Math.max(minTop, Math.min(pos.top, maxTop));
    var left = Math.max(minLeft, Math.min(pos.left, maxLeft));

    if (pos.top > maxTop) {
      top = pos.top - h - VIEWPORT_PADDING;
      if (top < minTop) top = minTop;
    }

    host.style.top = top + "px";
    host.style.left = left + "px";
  }

  // --- Tooltip DOM ---

  function getColor(riskLevel) {
    return RISK_COLORS[riskLevel] || DEFAULT_COLOR;
  }

  function createTooltipHost() {
    var host = document.createElement("div");
    host.setAttribute("style", "all: initial; position: absolute; z-index: 2147483647; pointer-events: none;");
    return host;
  }

  function buildTooltipShadow(host, label, riskLevel) {
    var shadow = host.attachShadow({ mode: "closed" });
    var color = getColor(riskLevel);

    var styleEl = document.createElement("style");
    styleEl.textContent = TOOLTIP_CSS;

    var tooltip = document.createElement("div");
    tooltip.className = "dlp";
    tooltip.style.borderLeft = "2px solid " + color;

    var dot = document.createElement("span");
    dot.className = "dot";
    dot.style.background = color;

    var textEl = document.createElement("span");
    textEl.textContent = label;

    tooltip.appendChild(dot);
    tooltip.appendChild(textEl);
    shadow.appendChild(styleEl);
    shadow.appendChild(tooltip);

    return { tooltip: tooltip, textEl: textEl, dot: dot };
  }

  // --- Tooltip Lifecycle ---

  function removeExisting() {
    if (currentTooltip && currentTooltip.parentNode) {
      currentTooltip.parentNode.removeChild(currentTooltip);
    }
    currentTooltip = null;
  }

  function updateTooltip(parts, label, riskLevel) {
    var color = getColor(riskLevel);
    parts.textEl.textContent = label;
    parts.dot.style.background = color;
    parts.tooltip.style.borderLeft = "2px solid " + color;
  }

  function scheduleRemoval(host, tooltip) {
    setTimeout(function () {
      if (!host.parentNode) return;
      tooltip.classList.add("out");
      setTimeout(function () {
        if (host.parentNode) host.parentNode.removeChild(host);
        if (currentTooltip === host) currentTooltip = null;
      }, FADE_OUT_MS);
    }, TOOLTIP_DISPLAY_MS);
  }

  // --- Clipboard Reading ---

  function readClipboardText(event) {
    // Primary: use event.clipboardData (synchronous, available in paste handler)
    if (event.clipboardData) {
      var text = event.clipboardData.getData("text/plain");
      if (text) return Promise.resolve(text);
    }

    // Fallback: use Async Clipboard API (requires clipboardRead permission)
    if (navigator.clipboard && navigator.clipboard.readText) {
      return navigator.clipboard.readText().catch(function () {
        return "";
      });
    }

    return Promise.resolve("");
  }

  // --- Main ---

  function formatLabel(data) {
    var risk = (data.risk || "Unknown").replace(" Risk", "");
    return "Payload Evaluated: " + risk;
  }

  function showTooltip(pastedText) {
    if (!document.body) return;
    removeExisting();

    var host = createTooltipHost();
    var parts = buildTooltipShadow(host, "Evaluating\u2026", null);

    document.body.appendChild(host);
    currentTooltip = host;
    clampToViewport(host, getTooltipPosition());

    if (!pastedText) {
      updateTooltip(parts, "Payload Evaluated", null);
      scheduleRemoval(host, parts.tooltip);
      return;
    }

    // Send to background service worker for zero-retention evaluation
    chrome.runtime.sendMessage(
      {
        type: "EVALUATE_PASTE",
        pastedText: pastedText,
        destinationUrl: window.location.href,
      },
      function (response) {
        if (!host.parentNode) return;
        if (response && response.risk) {
          updateTooltip(parts, formatLabel(response), response.risk);
        } else {
          updateTooltip(parts, "Payload Evaluated", null);
        }
        clampToViewport(host, getTooltipPosition());
        scheduleRemoval(host, parts.tooltip);
      }
    );
  }

  document.addEventListener("paste", function (event) {
    readClipboardText(event).then(function (text) {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          showTooltip(text);
        });
      });
    });
  });
})();
