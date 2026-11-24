import { prisma } from "@/lib/db";

export class CommissionObservationError extends Error {}

/**
 * Records one real, individually-observed commission reading the owner
 * read by hand off Mercado Livre's own affiliate panel UI for a SPECIFIC,
 * already-known offer (merchantListingId) — never a new/undiscovered
 * product (that flow is registerPanelPick in ml-panel-register.ts, which
 * additionally has to resolve WHICH product a panel row is from a pasted
 * affiliate link; here the product is already known, so that whole
 * resolution step doesn't apply).
 *
 * Writes the exact same `panel_pick`-shaped MerchantListingSignal row
 * ml-panel-register.ts writes at its own tail (same `source`, same `raw`
 * field names: panelTitle/rate/price/extras) so
 * evaluateCommissionEvidence (commission-evidence.ts) and
 * buildCommercialCandidatePool (vitrine-selection.ts, which already reads
 * the MOST RECENT panel_pick signal via `orderBy: { observedAt: "desc" }`)
 * pick it up with zero changes anywhere else — this is additive, append-
 * only, never an update/delete of a prior observation.
 */
export async function recordObservedCommission(input: {
  merchantListingId: string;
  /** 0..1 (e.g. 0.08 for 8%) — the rate as shown on the panel card. */
  rate: number;
  /** The price shown alongside it on the panel, in BRL. */
  price: number;
  /** True when the panel showed a "GANHOS EXTRAS" temporary-campaign
   * badge instead of the normal rate badge — never folded into a
   * baseline rate (see commission-evidence.ts). */
  isPromotionalExtra?: boolean;
}): Promise<void> {
  if (input.rate <= 0 || input.rate > 1) {
    throw new CommissionObservationError("Taxa de comissão fora do intervalo esperado (0 a 1, ex.: 0.08 para 8%).");
  }
  if (input.price <= 0) {
    throw new CommissionObservationError("Preço precisa ser maior que zero.");
  }

  const listing = await prisma.merchantListing.findUnique({
    where: { id: input.merchantListingId },
    select: { id: true, canonicalProduct: { select: { title: true } } },
  });
  if (!listing) {
    throw new CommissionObservationError("Produto da Vitrine não encontrado.");
  }

  await prisma.merchantListingSignal.create({
    data: {
      merchantListingId: listing.id,
      source: "panel_pick",
      raw: {
        panelTitle: listing.canonicalProduct?.title ?? null,
        rate: input.rate,
        price: input.price,
        extras: input.isPromotionalExtra ?? false,
      },
    },
  });
}
