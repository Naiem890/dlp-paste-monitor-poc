interface EvaluateRequest {
  pastedText: string;
  destinationUrl: string;
}

interface EvaluateResponse {
  risk: "High Risk" | "Medium Risk" | "Low Risk" | "Safe";
  ccDetected: boolean;
  riskyDomain: boolean;
  destinationUrl: string;
  timestamp: string;
}

const RISKY_DOMAINS = ["pastebin.com", "reddit.com"];

function detectCreditCard(text: string): boolean {
  // Match digit sequences (13-19 digits) possibly separated by spaces or dashes
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
  const lower = url.toLowerCase();
  return RISKY_DOMAINS.some((domain) => lower.includes(domain));
}

function evaluateRisk(ccDetected: boolean, riskyDomain: boolean): EvaluateResponse["risk"] {
  if (ccDetected && riskyDomain) return "High Risk";
  if (ccDetected) return "Medium Risk";
  if (riskyDomain) return "Low Risk";
  return "Safe";
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { pastedText, destinationUrl } = body as Record<string, unknown>;

    if (typeof pastedText !== "string" || typeof destinationUrl !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing required fields: pastedText, destinationUrl" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
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

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  },
};
