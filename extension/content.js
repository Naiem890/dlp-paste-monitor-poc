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

    var tooltip = document.createElement("div");
    tooltip.textContent = "Payload Evaluated";

    tooltip.setAttribute("style", [
      "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      "font-size: 13px",
      "color: #ffffff",
      "background-color: rgba(30, 30, 30, 0.92)",
      "padding: 6px 12px",
      "border-radius: 6px",
      "box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25)",
      "white-space: nowrap",
      "pointer-events: none",
      "line-height: 1.4",
    ].join("; "));

    shadow.appendChild(tooltip);
    return host;
  }

  function showTooltip() {
    if (!document.body) return;
    var pos = getTooltipPosition();
    var host = createTooltip();

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
      if (host.parentNode) {
        host.parentNode.removeChild(host);
      }
      if (currentTooltip === host) {
        currentTooltip = null;
      }
    }, 3000);
  }

  document.addEventListener("paste", function () {
    showTooltip();
  });
})();
