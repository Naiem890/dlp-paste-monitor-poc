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
      "@keyframes dlp-fade-in {",
      "  from { opacity: 0; transform: translateY(6px); }",
      "  to { opacity: 1; transform: translateY(0); }",
      "}",
      "@keyframes dlp-fade-out {",
      "  from { opacity: 1; transform: translateY(0); }",
      "  to { opacity: 0; transform: translateY(-4px); }",
      "}",
      "@keyframes dlp-pulse {",
      "  0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.25), 0 0 0 0 rgba(76,175,80,0.4); }",
      "  50% { box-shadow: 0 2px 8px rgba(0,0,0,0.25), 0 0 0 6px rgba(76,175,80,0); }",
      "}",
      ".dlp-tooltip {",
      "  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;",
      "  font-size: 13px;",
      "  color: #ffffff;",
      "  background: linear-gradient(135deg, rgba(30,30,30,0.95), rgba(50,50,50,0.95));",
      "  padding: 7px 14px;",
      "  border-radius: 8px;",
      "  border-left: 3px solid #4CAF50;",
      "  white-space: nowrap;",
      "  pointer-events: none;",
      "  line-height: 1.4;",
      "  letter-spacing: 0.3px;",
      "  animation: dlp-fade-in 0.25s ease-out, dlp-pulse 1.5s ease-in-out 0.3s 2;",
      "}",
      ".dlp-tooltip.dlp-exit {",
      "  animation: dlp-fade-out 0.3s ease-in forwards;",
      "}",
      ".dlp-icon {",
      "  display: inline-block;",
      "  width: 14px;",
      "  height: 14px;",
      "  margin-right: 6px;",
      "  vertical-align: -2px;",
      "  border-radius: 50%;",
      "  background: #4CAF50;",
      "  position: relative;",
      "}",
      ".dlp-icon::after {",
      "  content: '';",
      "  position: absolute;",
      "  left: 4px;",
      "  top: 2px;",
      "  width: 4px;",
      "  height: 7px;",
      "  border: solid #fff;",
      "  border-width: 0 2px 2px 0;",
      "  transform: rotate(45deg);",
      "}",
    ].join("\n");

    var tooltip = document.createElement("div");
    tooltip.className = "dlp-tooltip";

    var icon = document.createElement("span");
    icon.className = "dlp-icon";

    var text = document.createElement("span");
    text.textContent = "Payload Evaluated";

    tooltip.appendChild(icon);
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
    var tooltipHeight = hostRect.height || 30;
    var tooltipWidth = hostRect.width || 160;

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
      tip.classList.add("dlp-exit");
      setTimeout(function () {
        if (host.parentNode) host.parentNode.removeChild(host);
        if (currentTooltip === host) currentTooltip = null;
      }, 300);
    }, 3000);
  }

  document.addEventListener("paste", function () {
    showTooltip();
  });
})();
