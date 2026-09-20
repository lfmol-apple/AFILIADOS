import { afterEach, describe, expect, it, vi } from "vitest";
import { buildPerformanceDigest } from "@/lib/services/performance-digest";
import type { PerformanceDashboardData } from "@/lib/queries/performance-dashboard";

const NOW = new Date("2026-09-21T12:00:00Z");

const data: PerformanceDashboardData = {
  summary: {
    clicksLast7d: 50,
    clicksPrev7d: 64,
    pageviewsLast7d: 63,
    pageviewsPrev7d: 113,
    totalClicks: 114,
    totalPageviews: 198,
    activeLinksMl: 795,
    activeLinksShopee: 138,
    pendingLinksMl: 0,
  },
  clicksDaily: [
    { day: "2026-09-20", merchant: "MERCADO_LIVRE", clicks: 4 },
    { day: "2026-09-20", merchant: "SHOPEE", clicks: 3 },
    { day: "2026-09-19", merchant: "SHOPEE", clicks: 9 },
  ],
  pageviewsDaily: [{ day: "2026-09-20", pageviews: 12 }],
  topProducts: [
    {
      merchant: "MERCADO_LIVRE",
      title: 'Fralda <b>"G"</b> & cia',
      clicks: 5,
      lastClickAt: NOW,
    },
  ],
  clickSources: [{ source: "unified_offers", pageType: "ofertas", clicks: 60 }],
  automation: [
    { job: "ML_DEMAND", success: 8, partial: 52, failed: 0 },
    { job: "ML_ENRICHMENT", success: 46, partial: 12, failed: 1 },
  ],
};

describe("buildPerformanceDigest", () => {
  it("reports yesterday's real totals and the 7d deltas", () => {
    const d = buildPerformanceDigest(data, "https://precocaindo.com.br", NOW);
    expect(d.text).toContain("Ontem: 7 cliques, 12 pageviews");
    expect(d.text).toContain("Cliques (7d): 50 (↓ 22% vs 7 dias anteriores)");
    expect(d.text).toContain("Pageviews (7d): 63 (↓ 44% vs 7 dias anteriores)");
    expect(d.subject).toContain("50 cliques em 7d, 7 ontem");
  });

  it("flags failed and mostly-partial jobs", () => {
    const d = buildPerformanceDigest(data, "https://precocaindo.com.br", NOW);
    expect(d.text).toContain("ML_ENRICHMENT: 1 execução(ões) FAILED");
    expect(d.text).toContain("ML_DEMAND: maioria das execuções PARTIAL");
  });

  it("escapes product titles in the HTML body", () => {
    const d = buildPerformanceDigest(data, "https://precocaindo.com.br", NOW);
    expect(d.html).toContain(
      "Fralda &lt;b&gt;&quot;G&quot;&lt;/b&gt; &amp; cia",
    );
    expect(d.html).not.toContain('<b>"G"');
  });

  it("links the full dashboard and never states commission or revenue", () => {
    const d = buildPerformanceDigest(data, "https://precocaindo.com.br", NOW);
    expect(d.text).toContain("https://precocaindo.com.br/admin/desempenho");
    expect(d.text).not.toMatch(/R\$\s?\d/);
  });
});

describe("sendEmail", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("refuses to send without an API key", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { sendEmail, EmailNotConfiguredError } =
      await import("@/lib/services/email-sender");
    await expect(
      sendEmail({ to: "a@b.c", subject: "s", html: "h", text: "t" }),
    ).rejects.toBeInstanceOf(EmailNotConfiguredError);
  });

  it("posts to Resend with the bearer key and returns the message id", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("DAILY_DIGEST_EMAIL_FROM", "PreçoCaindo <x@precocaindo.com.br>");
    const { sendEmail } = await import("@/lib/services/email-sender");
    const fetchMock = vi.fn(
      async () =>
        new Response(JSON.stringify({ id: "msg_1" }), { status: 200 }),
    );
    const res = await sendEmail(
      { to: "dest@example.com", subject: "S", html: "<p>h</p>", text: "t" },
      fetchMock as unknown as typeof fetch,
    );
    expect(res.id).toBe("msg_1");
    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe(
      "Bearer re_test_key",
    );
    const body = JSON.parse(init.body as string);
    expect(body.to).toEqual(["dest@example.com"]);
    expect(body.from).toBe("PreçoCaindo <x@precocaindo.com.br>");
  });

  it("throws with the provider status when Resend rejects the request", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    const { sendEmail } = await import("@/lib/services/email-sender");
    const fetchMock = vi.fn(async () => new Response("bad", { status: 422 }));
    await expect(
      sendEmail(
        { to: "a@b.c", subject: "s", html: "h", text: "t" },
        fetchMock as unknown as typeof fetch,
      ),
    ).rejects.toThrow(/422/);
  });
});
