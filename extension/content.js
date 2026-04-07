"use strict";

(function () {
  let currentTooltip = null;

  function getTooltipPosition() {
    const active = document.activeElement;
    if (!active) return { top: 100, left: 100 };

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) {
        return {
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
        };
      }
    }

    const rect = active.getBoundingClientRect();
    return {
      top: rect.bottom + window.scrollY + 4,
      left: rect.right + window.scrollX - 160,
    };
  }

  function removeExistingTooltip() {
    if (currentTooltip && currentTooltip.parentNode) {
      currentTooltip.parentNode.removeChild(currentTooltip);
    }
    currentTooltip = null;
  }

  function createTooltip() {
    removeExistingTooltip();

    var host = document.createElement("div");
    host.setAttribute("style", "all: initial; position: absolute; z-index: 2147483647; pointer-events: none;");

    var shadow = host.attachShadow({ mode: "closed" });

    var styleEl = document.createElement("style");
    styleEl.textContent = [
      "@keyframes dlp-in { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }",
      "@keyframes dlp-out { from { opacity: 1; } to { opacity: 0; } }",
      ".t {",
      "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;",
      "  font-size: 11px;",
      "  font-weight: 500;",
      "  color: rgba(255,255,255,0.85);",
      "  background: rgba(0,0,0,0.75);",
      "  backdrop-filter: blur(8px);",
      "  -webkit-backdrop-filter: blur(8px);",
      "  padding: 5px 10px;",
      "  border-radius: 4px;",
      "  white-space: nowrap;",
      "  pointer-events: none;",
      "  line-height: 1;",
      "  animation: dlp-in 0.15s ease-out;",
      "}",
      ".t.out { animation: dlp-out 0.2s ease-in forwards; }",
    ].join("\n");

    var tooltip = document.createElement("div");
    tooltip.className = "t";
    tooltip.textContent = "Payload Evaluated";

    shadow.appendChild(styleEl);
    shadow.appendChild(tooltip);
    return { host: host, tooltip: tooltip };
  }

  function showTooltip() {
    if (!document.body) return;
    var pos = getTooltipPosition();
    var result = createTooltip();
    var host = result.host;
    var tip = result.tooltip;

    document.body.appendChild(host);
    currentTooltip = host;

    var hostRect = host.getBoundingClientRect();
    var tooltipHeight = hostRect.height || 24;
    var tooltipWidth = hostRect.width || 120;

    var maxTop = window.scrollY + window.innerHeight - tooltipHeight - 8;
    var maxLeft = window.scrollX + window.innerWidth - tooltipWidth - 8;

    var top = Math.max(window.scrollY + 8, Math.min(pos.top, maxTop));
    var left = Math.max(window.scrollX + 8, Math.min(pos.left, maxLeft));

    if (pos.top > maxTop) {
      top = pos.top - tooltipHeight - 8;
      if (top < window.scrollY + 8) top = window.scrollY + 8;
    }

    host.style.top = top + "px";
    host.style.left = left + "px";

    setTimeout(function () {
      if (!host.parentNode) return;
      tip.classList.add("out");
      setTimeout(function () {
        if (host.parentNode) host.parentNode.removeChild(host);
        if (currentTooltip === host) currentTooltip = null;
      }, 200);
    }, 3000);
  }

  document.addEventListener("paste", function () {
    showTooltip();
  });
})();
