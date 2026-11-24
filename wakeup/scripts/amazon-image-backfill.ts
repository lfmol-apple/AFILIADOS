import { prisma } from "@/lib/db";
import { logger } from "@/lib/observability/logger";

/**
 * One-off backfill for Amazon products that have no photo (owner's
 * request, 2026-11-18: "mostre as imagens da amazon dos que já estão
 * lá" — the original WhatsApp messages that would have carried a
 * thumbnail are gone, consumed by earlier harvest runs; nothing to
 * replay them from).
 *
 * First attempt (a plain GET, no cookies) was blocked outright by
 * Amazon's anti-bot wall on every single one of 454 products (confirmed
 * live, 2026-11-18 — every response was the same ~3.9KB "robot check"
 * interstitial, never the real page). Found live the same day: a
 * "warmed" session — GET the homepage first, keep its Set-Cookie
 * values, then GET the product page with those cookies and a Referer —
 * reliably reaches the REAL page instead (confirmed on 3 ASINs: 1-2MB
 * responses, no bot-check markers). The real page has no simple
 * `og:image` meta tag; the actual photo lives inside `landingImage`'s
 * `data-a-dynamic-image` attribute as an HTML-entity-escaped JSON object
 * mapping each real m.media-amazon.com URL to its pixel dimensions —
 * this reads the first (smallest-but-real) one, never invents or
 * resizes anything itself.
 *
 * Still a direct request to Amazon, so this runs gently: one product at
 * a time, a real pause between each (plus the extra homepage warm-up
 * request), and a skip — never a retry loop — on any failure. Amazon's
 * wall is known to be inconsistent (see docs/AMAZON_COMPLIANCE.md's
 * dead-ASIN investigation); hammering it to "make sure" would be the
 * wrong way to find out it's still up.
 */
const DELAY_MS = 1_500;
const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function warmedCookies(): Promise<string> {
  const res = await fetch("https://www.amazon.com.br/", {
    headers: { "user-agent": USER_AGENT, "accept-language": "pt-BR,pt;q=0.9" },
    signal: AbortSignal.timeout(12_000),
  });
  const jar: string[] = [];
  for (const [key, value] of res.headers.entries()) {
    if (key.toLowerCase() === "set-cookie") jar.push(value.split(";")[0]!);
  }
  return jar.join("; ");
}

function extractRealImageUrl(html: string): string | null {
  const attrMatch = html.match(/data-a-dynamic-image="([^"]+)"/);
  if (!attrMatch) return null;
  const decoded = attrMatch[1]!.replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  const urlMatch = decoded.match(/https:\/\/m\.media-amazon\.com\/images\/I\/[^"]+\.jpg/);
  return urlMatch ? urlMatch[0] : null;
}

async function fetchRealImage(asin: string, cookie: string): Promise<string | null> {
  try {
    const res = await fetch(`https://www.amazon.com.br/dp/${asin}`, {
      headers: {
        "user-agent": USER_AGENT,
        "accept-language": "pt-BR,pt;q=0.9",
        cookie,
        referer: "https://www.amazon.com.br/",
      },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const html = await res.text();
    return extractRealImageUrl(html);
  } catch {
    return null;
  }
}

/**
 * Owner's call, 2026-11-18, after watching Amazon's block rate climb
 * from ~2% to ~90%+ partway through a 445-item run: do the rest in
 * smaller batches, spread out, instead of one long run. --limit caps
 * how many this invocation attempts; rerun later for the next batch —
 * always picks up the oldest-created products without a photo first
 * (`orderBy: createdAt asc`), so repeated small runs sweep through the
 * whole backlog without needing to track where the last one stopped.
 */
async function main() {
  const limitArg = process.argv[2] ? Number(process.argv[2]) : undefined;
  const limit = limitArg && Number.isInteger(limitArg) && limitArg > 0 ? limitArg : undefined;

  const products = await prisma.product.findMany({
    where: { provider: "AMAZON", active: true, imageUrl: null },
    select: { id: true, asin: true, title: true },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  console.log(`${products.length} produtos Amazon ativos sem foto${limit ? ` (lote de até ${limit})` : ""}.`);
  let updated = 0;
  let failed = 0;

  for (const product of products) {
    const cookie = await warmedCookies().catch(() => "");
    await sleep(1_000);
    const imageUrl = await fetchRealImage(product.asin, cookie);
    if (imageUrl) {
      await prisma.product.update({ where: { id: product.id }, data: { imageUrl } });
      updated += 1;
      console.log(`✓ ${product.asin} ${product.title.slice(0, 50)}`);
    } else {
      failed += 1;
      logger.warn("amazon_image_backfill.not_found", { asin: product.asin });
    }
    await sleep(DELAY_MS);
  }

  console.log(`Concluído: ${updated} atualizados, ${failed} sem imagem encontrada.`);
}

main()
  .catch((err) => {
    console.error("amazon-image-backfill failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
