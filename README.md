# DLP Paste Monitor — Proof of Concept

A corporate Data Loss Prevention proof of concept consisting of:

1. **Chrome MV3 Extension** — Detects paste events and displays a Shadow DOM-protected tooltip
2. **Cloudflare Worker** — Edge-deployed triage engine that evaluates text for credit card patterns and risky domains

## Chrome Extension Setup

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `extension/` directory from this repository
5. Navigate to any website with a text input and paste some text
6. A floating tooltip reading **"Payload Evaluated"** will appear near the cursor for 3 seconds

### Shadow DOM Verification

The tooltip is injected inside a closed Shadow Root. To verify it survives hostile CSS:

1. Open DevTools Console on any page
2. Run: `document.querySelectorAll('div').forEach(d => d.style.display = 'none')`
3. Paste text — the tooltip still appears

## Cloudflare Worker Setup

```bash
cd worker
npm install
```

### Run Locally

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

### Test with curl

**High Risk** — Credit card pasted to pastebin:
```bash
curl -X POST http://localhost:8787/evaluate \
  -H "Content-Type: application/json" \
  -d '{"pastedText": "4111111111111111", "destinationUrl": "https://pastebin.com/new"}'
```

**Safe** — Normal text pasted to internal domain:
```bash
curl -X POST http://localhost:8787/evaluate \
  -H "Content-Type: application/json" \
  -d '{"pastedText": "hello world", "destinationUrl": "https://internal-crm.local/notes"}'
```

## Sub-50ms Global Latency Strategy

Cloudflare Workers execute on 300+ edge Points of Presence worldwide using V8 isolates — not containers. Unlike traditional serverless (AWS Lambda), V8 isolates have near-zero cold start overhead because they share a single runtime process. Our worker performs only synchronous CPU-bound operations: regex matching and Luhn checksum validation. There are no database queries, no external API calls, and no KV lookups. The entire evaluation completes in under 1ms of CPU time. Combined with Cloudflare's anycast routing — which directs each request to the geographically nearest PoP — total response time including network latency stays well under 50ms globally.

## Architecture Decisions

- **No `clipboardRead` permission** — Listens to DOM `paste` events, avoiding Chrome Web Store manual review
- **Closed Shadow Root** — Host page cannot access tooltip DOM or restyle it
- **No `innerHTML`** — All DOM manipulation via `createElement` + `textContent` to prevent XSS
- **Zero runtime dependencies** — Both extension and worker have no npm dependencies in production code
- **Non-blocking paste** — `preventDefault()` is never called; paste completes normally
