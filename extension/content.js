"use strict";

(function () {
  var WORKER_URL = "https://dlp-triage-worker.solaiman-naiem890.workers.dev/evaluate";
  var currentTooltip = null;

  function getTooltipPosition() {
    var active = document.activeElement;
    if (!active) return { top: 100, left: 100 };

    var sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      var range = sel.getRangeAt(0);
      var rect = range.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) {
        return {
          top: rect.bottom + window.scrollY + 4,
          left: rect.left + window.scrollX,
        };
      }
    }

    var elRect = active.getBoundingClientRect();
    return {
      top: elRect.bottom + window.scrollY + 4,
      left: elRect.right + window.scrollX - 160,
    };
  }

  function removeExistingTooltip() {
    if (currentTooltip && currentTooltip.parentNode) {
      currentTooltip.parentNode.removeChild(currentTooltip);
    }
    currentTooltip = null;
  }

  function createTooltip(label, riskLevel) {
    removeExistingTooltip();

    var host = document.createElement("div");
    host.setAttribute("style", "all: initial; position: absolute; z-index: 2147483647; pointer-events: none;");

    var shadow = host.attachShadow({ mode: "closed" });

    var colors = {
      "High Risk": { dot: "#ef4444", border: "#ef4444" },
      "Medium Risk": { dot: "#f59e0b", border: "#f59e0b" },
      "Low Risk": { dot: "#3b82f6", border: "#3b82f6" },
      "Safe": { dot: "#22c55e", border: "#22c55e" },
      "default": { dot: "#a1a1aa", border: "#a1a1aa" },
    };
    var scheme = colors[riskLevel] || colors["default"];

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
      "  border-left: 2px solid " + scheme.border + ";",
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
      "  background: " + scheme.dot + ";",
      "  flex-shrink: 0;",
      "}",
    ].join("\n");

    var tooltip = document.createElement("div");
    tooltip.className = "dlp";

    var dot = document.createElement("span");
    dot.className = "dot";

    var text = document.createElement("span");
    text.textContent = label;

    tooltip.appendChild(dot);
    tooltip.appendChild(text);

    shadow.appendChild(styleEl);
    shadow.appendChild(tooltip);
    return { host: host, tooltip: tooltip, textEl: text, dotEl: dot, styleEl: styleEl };
  }

  function positionHost(host) {
    var pos = getTooltipPosition();

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
  }

  function updateTooltip(parts, label, riskLevel) {
    var colors = {
      "High Risk": { dot: "#ef4444", border: "#ef4444" },
      "Medium Risk": { dot: "#f59e0b", border: "#f59e0b" },
      "Low Risk": { dot: "#3b82f6", border: "#3b82f6" },
      "Safe": { dot: "#22c55e", border: "#22c55e" },
      "default": { dot: "#a1a1aa", border: "#a1a1aa" },
    };
    var scheme = colors[riskLevel] || colors["default"];

    parts.textEl.textContent = label;
    parts.dotEl.style.background = scheme.dot;
    parts.styleEl.textContent = parts.styleEl.textContent
      .replace(/border-left: 2px solid [^;]+;/, "border-left: 2px solid " + scheme.border + ";");

    positionHost(parts.host);
  }

  function scheduleRemoval(host, tip) {
    setTimeout(function () {
      if (!host.parentNode) return;
      tip.classList.add("out");
      setTimeout(function () {
        if (host.parentNode) host.parentNode.removeChild(host);
        if (currentTooltip === host) currentTooltip = null;
      }, 250);
    }, 3000);
  }

  function getPastedText(event) {
    if (event.clipboardData) {
      return event.clipboardData.getData("text/plain");
    }
    return "";
  }

  function showTooltip(pastedText) {
    if (!document.body) return;

    var result = createTooltip("Evaluating\u2026", null);
    var host = result.host;
    var tip = result.tooltip;

    document.body.appendChild(host);
    currentTooltip = host;
    positionHost(host);

    var destinationUrl = window.location.href;

    if (pastedText) {
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
          if (!host.parentNode) return;
          var label = data.risk || "Payload Evaluated";
          updateTooltip(result, label, data.risk);
          scheduleRemoval(host, tip);
        })
        .catch(function () {
          if (!host.parentNode) return;
          updateTooltip(result, "Payload Evaluated", null);
          scheduleRemoval(host, tip);
        });
    } else {
      updateTooltip(result, "Payload Evaluated", null);
      scheduleRemoval(host, tip);
    }
  }

  document.addEventListener("paste", function (event) {
    var pastedText = getPastedText(event);
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        showTooltip(pastedText);
      });
    });
  });
})();
