import { describe, it, expect } from "vitest";
import { SELF } from "cloudflare:test";

describe("DLP Triage Worker", () => {
  describe("POST /evaluate", () => {
    it("returns High Risk for CC number pasted to pastebin.com", async () => {
      const res = await SELF.fetch("http://localhost/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pastedText: "my card is 4111111111111111",
          destinationUrl: "https://pastebin.com/new",
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.risk).toBe("High Risk");
      expect(data.ccDetected).toBe(true);
      expect(data.riskyDomain).toBe(true);
    });

    it("returns Medium Risk for CC number pasted to safe domain", async () => {
      const res = await SELF.fetch("http://localhost/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pastedText: "4111111111111111",
          destinationUrl: "https://internal-crm.local/notes",
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.risk).toBe("Medium Risk");
      expect(data.ccDetected).toBe(true);
      expect(data.riskyDomain).toBe(false);
    });

    it("returns Low Risk for normal text pasted to reddit.com", async () => {
      const res = await SELF.fetch("http://localhost/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pastedText: "just a regular comment",
          destinationUrl: "https://reddit.com/r/test",
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.risk).toBe("Low Risk");
      expect(data.ccDetected).toBe(false);
      expect(data.riskyDomain).toBe(true);
    });

    it("returns Safe for normal text pasted to safe domain", async () => {
      const res = await SELF.fetch("http://localhost/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pastedText: "hello world",
          destinationUrl: "https://internal-crm.local/notes",
        }),
      });
      expect(res.status).toBe(200);
      const data = await res.json() as Record<string, unknown>;
      expect(data.risk).toBe("Safe");
      expect(data.ccDetected).toBe(false);
      expect(data.riskyDomain).toBe(false);
    });
  });

  describe("input validation", () => {
    it("returns 405 for GET requests", async () => {
      const res = await SELF.fetch("http://localhost/evaluate", {
        method: "GET",
      });
      expect(res.status).toBe(405);
    });

    it("returns 400 for missing pastedText", async () => {
      const res = await SELF.fetch("http://localhost/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          destinationUrl: "https://example.com",
        }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for missing destinationUrl", async () => {
      const res = await SELF.fetch("http://localhost/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pastedText: "some text",
        }),
      });
      expect(res.status).toBe(400);
    });

    it("returns 400 for malformed JSON", async () => {
      const res = await SELF.fetch("http://localhost/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not json",
      });
      expect(res.status).toBe(400);
    });
  });

  describe("credit card detection edge cases", () => {
    it("detects CC with spaces", async () => {
      const res = await SELF.fetch("http://localhost/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pastedText: "4111 1111 1111 1111",
          destinationUrl: "https://pastebin.com",
        }),
      });
      const data = await res.json() as Record<string, unknown>;
      expect(data.ccDetected).toBe(true);
    });

    it("detects CC with dashes", async () => {
      const res = await SELF.fetch("http://localhost/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pastedText: "4111-1111-1111-1111",
          destinationUrl: "https://pastebin.com",
        }),
      });
      const data = await res.json() as Record<string, unknown>;
      expect(data.ccDetected).toBe(true);
    });

    it("does not flag random short numbers as CC", async () => {
      const res = await SELF.fetch("http://localhost/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pastedText: "call me at 12345",
          destinationUrl: "https://pastebin.com",
        }),
      });
      const data = await res.json() as Record<string, unknown>;
      expect(data.ccDetected).toBe(false);
    });
  });
});
