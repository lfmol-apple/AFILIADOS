import { describe, expect, it } from "vitest";
import { isKnownBotRequest } from "@/lib/http/is-bot-request";

function headers(h: Record<string, string> = {}): Headers {
  return new Headers(h);
}

describe("isKnownBotRequest", () => {
  it("a real browser User-Agent is never a bot", () => {
    expect(
      isKnownBotRequest(
        headers({
          "user-agent":
            "Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
        }),
      ),
    ).toBe(false);
  });

  it("a missing User-Agent is treated as a bot — no real browser omits it", () => {
    expect(isKnownBotRequest(headers())).toBe(true);
  });

  it("known crawler/bot names are flagged, including search engines", () => {
    for (const ua of [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "GPTBot/1.0",
      "ClaudeBot/1.0",
      "CCBot/2.0",
      "AhrefsBot/7.0",
      "SemrushBot/7~bl",
      "MJ12bot/v1.4.8",
      "facebookexternalhit/1.1",
      "Mozilla/5.0 (compatible; PetalBot;+https://webmaster.petalsearch.com/site/petalbot)",
    ]) {
      expect(isKnownBotRequest(headers({ "user-agent": ua }))).toBe(true);
    }
  });

  it("the shape found live 2026-10-26 — a plain scripted HTTP client with no browser signature", () => {
    for (const ua of [
      "curl/8.4.0",
      "python-requests/2.31.0",
      "Go-http-client/1.1",
      "Wget/1.21.3",
    ]) {
      expect(isKnownBotRequest(headers({ "user-agent": ua }))).toBe(true);
    }
  });
});
