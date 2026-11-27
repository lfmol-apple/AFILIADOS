import { prisma } from "@/lib/db";
import { PINNED_OFFER_EXTERNAL_IDS } from "@/lib/config/pinned-offers";
import { getMercadoLivreOfferCardsByExternalIds } from "@/lib/queries/unified-offers";

async function main() {
  console.log("pin list length:", PINNED_OFFER_EXTERNAL_IDS.length);
  const ids = ["MLB30144703", "MLB55232692", "MLB64322156", "MLB21361292", "MLB24326256", "MLB-4824049721"];
  for (const id of ids) {
    const row = await prisma.merchantListing.findMany({
      where: { externalId: id, merchant: { code: "MERCADO_LIVRE" } },
      include: { affiliateLink: true, canonicalProduct: true },
    });
    console.log(id, JSON.stringify(row.map((r) => ({
      active: r.active,
      canonicalProductId: r.canonicalProductId,
      affiliateLinkStatus: r.affiliateLink?.status,
      hasCanonical: !!r.canonicalProduct,
    }))));
  }
  try {
    const cards = await getMercadoLivreOfferCardsByExternalIds(PINNED_OFFER_EXTERNAL_IDS, { source: "debug" });
    console.log("cards returned:", cards.length);
    console.log("ids returned:", JSON.stringify(cards.map((c) => c.id)));
  } catch (e) {
    console.error("ERROR calling getMercadoLivreOfferCardsByExternalIds:", e);
  }
}

main().finally(() => process.exit(0));
