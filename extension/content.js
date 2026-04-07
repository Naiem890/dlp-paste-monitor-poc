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
      "  border-left: 2px solid #22c55e;",
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
      "  background: #22c55e;",
      "  flex-shrink: 0;",
      "}",
    ].join("\n");

    var tooltip = document.createElement("div");
    tooltip.className = "dlp";

    var dot = document.createElement("span");
    dot.className = "dot";

    var text = document.createElement("span");
    text.textContent = "Payload Evaluated";

    tooltip.appendChild(dot);
    tooltip.appendChild(text);

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
    var tooltipHeight = hostRect.height || 28;
    var tooltipWidth = hostRect.width || 150;

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
      }, 250);
    }, 3000);
  }

  document.addEventListener("paste", function () {
    showTooltip();
  });
})();
