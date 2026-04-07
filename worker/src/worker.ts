interface EvaluateResponse {
  risk: "High Risk" | "Medium Risk" | "Low Risk" | "Safe";
  ccDetected: boolean;
  riskyDomain: boolean;
  destinationUrl: string;
  timestamp: string;
}

const RISKY_DOMAINS = ["pastebin.com", "reddit.com"];

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

function detectCreditCard(text: string): boolean {
  const match = text.match(/\d[\d\s-]{11,17}\d/);
  if (!match) return false;
  const digits = match[0].replace(/[\s-]/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  return luhnCheck(digits);
}

function luhnCheck(digits: string): boolean {
  let sum = 0;
  let alternate = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i], 10);
    if (alternate) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

function isRiskyDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    return RISKY_DOMAINS.some((domain) => hostname === domain || hostname.endsWith("." + domain));
  } catch {
    return false;
  }
}

function evaluateRisk(ccDetected: boolean, riskyDomain: boolean): EvaluateResponse["risk"] {
  if (ccDetected && riskyDomain) return "High Risk";
  if (ccDetected) return "Medium Risk";
  if (riskyDomain) return "Low Risk";
  return "Safe";
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }

    const { pastedText, destinationUrl } = body as Record<string, unknown>;

    if (typeof pastedText !== "string" || typeof destinationUrl !== "string") {
      return jsonResponse({ error: "Missing required fields: pastedText, destinationUrl" }, 400);
    }

    const ccDetected = detectCreditCard(pastedText);
    const riskyDomain = isRiskyDomain(destinationUrl);
    const risk = evaluateRisk(ccDetected, riskyDomain);

    const response: EvaluateResponse = {
      risk,
      ccDetected,
      riskyDomain,
      destinationUrl,
      timestamp: new Date().toISOString(),
    };

    return jsonResponse(response, 200);
  },
};
