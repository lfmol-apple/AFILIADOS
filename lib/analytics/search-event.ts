import { prisma } from "@/lib/db";
import { normalizeKeyword } from "@/lib/demand/normalize";

/**
 * Records internal search as an operational/product signal (core to how
 * /ofertas and DemandEngine work), not third-party analytics — no IP, no
 * persistent cross-site identifier, server-side only. See docs/PRIVACY.md
 * for why this isn't gated behind the ANALYTICS consent category the way
 * PageView tracking is.
 */
export async function recordSearchEvent(
  query: string,
  resultCount: number,
  clickedProductId?: string,
): Promise<void> {
  const trimmed = query.trim();
  if (!trimmed) return;

  await prisma.searchEvent.create({
    data: {
      query: trimmed,
      normalizedQuery: normalizeKeyword(trimmed),
      resultCount,
      clickedProductId,
    },
  });
}
