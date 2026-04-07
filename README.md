# DLP Paste Monitor — Proof of Concept

A corporate Data Loss Prevention proof of concept consisting of:

1. **Chrome MV3 Extension** — Detects paste events, sends pasted content to the edge triage engine, and displays a color-coded risk assessment inside a Shadow DOM-protected tooltip
2. **Cloudflare Worker** — Edge-deployed triage engine that evaluates text for credit card patterns and risky destination domains

## How It Works

1. User pastes text on any website
2. Extension captures the pasted text and current page URL
3. Sends payload to the deployed Cloudflare Worker for evaluation
4. Worker checks for credit card patterns (regex + Luhn) and risky domains (pastebin.com, reddit.com)
5. Tooltip updates with the risk result — color-coded: **red** (High), **amber** (Medium), **blue** (Low), **green** (Safe)
6. Falls back to "Payload Evaluated" if the worker is unreachable

## Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` directory from this repository
5. Navigate to any website with a text input and paste some text
6. A floating tooltip will appear near the cursor showing the risk assessment

### Shadow DOM Verification

The tooltip is injected inside a closed Shadow Root. To verify it survives hostile CSS:

1. Open DevTools Console on any page
2. Run: `document.querySelectorAll('div').forEach(d => d.style.display = 'none')`
3. Paste text — the tooltip still appears

## Cloudflare Worker

**Live endpoint:** `https://dlp-triage-worker.solaiman-naiem890.workers.dev/evaluate`

### Local Development

```bash
cd worker
npm install
npm run dev
```

### Run Tests

```bash
cd worker
npm test
```

### Test with curl

**High Risk** — Credit card pasted to pastebin:
```bash
curl -X POST https://dlp-triage-worker.solaiman-naiem890.workers.dev/evaluate \
  -H "Content-Type: application/json" \
  -d '{"pastedText": "4111111111111111", "destinationUrl": "https://pastebin.com/new"}'
```

**Medium Risk** — Credit card pasted to safe domain:
```bash
curl -X POST https://dlp-triage-worker.solaiman-naiem890.workers.dev/evaluate \
  -H "Content-Type: application/json" \
  -d '{"pastedText": "4111111111111111", "destinationUrl": "https://internal-crm.local"}'
```

**Low Risk** — Normal text pasted to risky domain:
```bash
curl -X POST https://dlp-triage-worker.solaiman-naiem890.workers.dev/evaluate \
  -H "Content-Type: application/json" \
  -d '{"pastedText": "hello world", "destinationUrl": "https://reddit.com/r/test"}'
```

**Safe** — Normal text pasted to internal domain:
```bash
curl -X POST https://dlp-triage-worker.solaiman-naiem890.workers.dev/evaluate \
  -H "Content-Type: application/json" \
  -d '{"pastedText": "hello world", "destinationUrl": "https://internal-crm.local/notes"}'
```

## Sub-50ms Global Latency Strategy

Cloudflare Workers execute on 300+ edge Points of Presence worldwide using V8 isolates — not containers. Unlike traditional serverless (AWS Lambda), V8 isolates have near-zero cold start overhead because they share a single runtime process. Our worker performs only synchronous CPU-bound operations: regex matching and Luhn checksum validation. There are no database queries, no external API calls, and no KV lookups. The entire evaluation completes in under 1ms of CPU time. Combined with Cloudflare's anycast routing — which directs each request to the geographically nearest PoP — total response time including network latency stays well under 50ms globally.

## Build & Minification Strategy

The extension uses [Terser](https://github.com/terser/terser) for direct minification rather than a full bundler (Webpack, Vite). This is a deliberate choice for the PoC scope — a single content script does not warrant the complexity of a build pipeline, and keeping the toolchain minimal reduces the attack surface for a security-focused product. The unminified source (`content.js`) is included alongside the minified output (`content.min.js`) for easy code review. For the full MVP — with multiple scripts, a background service worker, and React components — we would introduce Vite or Webpack as the build system.

## Architecture Decisions

- **No `clipboardRead` permission** — Listens to DOM `paste` events, avoiding Chrome Web Store manual review for the `clipboardRead` permission
- **Closed Shadow Root** — Host page cannot access tooltip DOM or restyle it via `host.shadowRoot` (returns `null`)
- **No `innerHTML`** — All DOM manipulation via `createElement` + `textContent` to prevent XSS
- **Zero runtime dependencies** — Both extension and worker have no npm dependencies in production code
- **Non-blocking paste** — `preventDefault()` is never called; paste completes normally
- **CORS enabled** — Worker accepts cross-origin requests from the extension with proper preflight handling
- **Graceful degradation** — Extension falls back to static "Payload Evaluated" if worker is unreachable
