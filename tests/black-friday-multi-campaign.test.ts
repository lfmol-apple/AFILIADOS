import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import {
  loadBlackFridayPanel,
  loadXmlEligibleBlackFridayProducts,
  updateBlackFridayProduct,
  BlackFridayUpdateError,
  BLACK_FRIDAY_2026_CAMPAIGN,
  BLACK_FRIDAY_FIM_DO_MUNDO_CAMPAIGN,
} from "@/lib/services/black-friday-2026";
import { GET as blackFriday2026XmlRoute } from "@/app/catalogo/black-friday-2026.xml/route";
import { GET as blackFridayFimDoMundoXmlRoute } from "@/app/catalogo/black-friday-fim-do-mundo.xml/route";

/**
 * Owner's directive, 2026-11-26 ("SEGUNDA CAMPANHA — BLACK FRIDAY FIM DO
 * MUNDO", section 3, "independência das campanhas"): proves the two
 * campaigns (and a hypothetical third, same mechanism) never leak into
 * each other — same slotNumber reused across campaigns without
 * collision, loadBlackFridayPanel/loadXmlEligibleBlackFridayProducts
 * scoped strictly by campaign, a creative from one campaign can never be
 * attached to a product in another, and each campaign's own XML feed
 * only ever lists its own rows.
 */
const TEST_SLOT_BASE = -800000;
const CAMPAIGN_A = "bftest-campaign-a";
const CAMPAIGN_B = "bftest-campaign-b";

async function makeCampaignFixture(opts: {
  campaign: string;
  slot: number;
  status?: "PENDING_LINK" | "LINK_PASTED" | "VALIDATED" | "DIVERGENT" | "REJECTED";
  withLinks?: boolean;
}) {
  const groupKey = `bftest-mc-group-${opts.campaign}-${opts.slot}-${Date.now()}-${Math.random()}`;
  const sha256 = `bftest-mc-sha-${opts.campaign}-${opts.slot}-${Date.now()}-${Math.random()}`;
  const creative = await prisma.blackFridayCreative.create({
    data: {
      campaign: opts.campaign,
      groupKey,
      sha256,
      originalFilename: "fixture.jpeg",
      storedPath: `/black-friday-2026/fixture-${sha256}.jpeg`,
    },
  });

  const product = await prisma.blackFridayProduct.create({
    data: {
      campaign: opts.campaign,
      slotNumber: TEST_SLOT_BASE + opts.slot,
      creativeGroupKey: groupKey,
      name: `Produto fixture multi-campanha ${opts.campaign} #${opts.slot}`,
      advertisedPrice: 199.9,
      status: opts.status ?? "PENDING_LINK",
      selectedCreativeId: creative.id,
      ...(opts.withLinks
        ? {
            mlUrlOriginal: "https://www.mercadolivre.com.br/p/MLB2222222",
            affiliateUrl: "https://mercadolivre.com/sec/bfmctestlink",
          }
        : {}),
    },
  });

  return { product, creative, groupKey };
}

afterEach(async () => {
  await prisma.blackFridayProduct.deleteMany({
    where: { slotNumber: { gte: TEST_SLOT_BASE, lte: TEST_SLOT_BASE + 1000 } },
  });
  await prisma.blackFridayCreative.deleteMany({
    where: { groupKey: { startsWith: "bftest-mc-group-" } },
  });
});

describe("cross-campaign isolation", () => {
  it("the same slotNumber can exist in two different campaigns at once without a unique-constraint collision", async () => {
    const a = await makeCampaignFixture({ campaign: CAMPAIGN_A, slot: 1 });
    const b = await makeCampaignFixture({ campaign: CAMPAIGN_B, slot: 1 });
    expect(a.product.slotNumber).toBe(b.product.slotNumber);
    expect(a.product.id).not.toBe(b.product.id);
  });

  it("loadBlackFridayPanel(campaign) never returns another campaign's rows, even when slot numbers collide", async () => {
    await makeCampaignFixture({ campaign: CAMPAIGN_A, slot: 2 });
    await makeCampaignFixture({ campaign: CAMPAIGN_B, slot: 2 });

    const { rows: rowsA } = await loadBlackFridayPanel(CAMPAIGN_A);
    const { rows: rowsB } = await loadBlackFridayPanel(CAMPAIGN_B);

    expect(rowsA.every((r) => r.campaign === CAMPAIGN_A)).toBe(true);
    expect(rowsB.every((r) => r.campaign === CAMPAIGN_B)).toBe(true);
  });

  it("refuses to attach a creative from a different campaign to a product, even if it somehow shared a groupKey", async () => {
    const a = await makeCampaignFixture({ campaign: CAMPAIGN_A, slot: 3 });
    const b = await makeCampaignFixture({ campaign: CAMPAIGN_B, slot: 4 });
    // Force the two groups to share a literal groupKey string, to prove
    // the campaign check (not just groupKey) is what's actually guarding
    // this — a real cross-campaign groupKey collision never happens in
    // practice (every seed script prefixes its own), but the check must
    // hold regardless.
    await prisma.blackFridayCreative.update({ where: { id: b.creative.id }, data: { groupKey: a.groupKey } });

    await expect(
      updateBlackFridayProduct(a.product.id, { selectedCreativeId: b.creative.id }),
    ).rejects.toThrow(BlackFridayUpdateError);
  });

  it("loadXmlEligibleBlackFridayProducts(campaign) never includes another campaign's eligible product", async () => {
    await makeCampaignFixture({ campaign: CAMPAIGN_A, slot: 5, status: "VALIDATED", withLinks: true });
    await makeCampaignFixture({ campaign: CAMPAIGN_B, slot: 5, status: "VALIDATED", withLinks: true });

    const eligibleA = await loadXmlEligibleBlackFridayProducts(CAMPAIGN_A);
    const eligibleB = await loadXmlEligibleBlackFridayProducts(CAMPAIGN_B);

    expect(eligibleA.every((p) => p.campaign === CAMPAIGN_A)).toBe(true);
    expect(eligibleB.every((p) => p.campaign === CAMPAIGN_B)).toBe(true);
  });
});

describe("the two real campaigns' own data (read-only against whatever is seeded in this environment)", () => {
  it("black-friday-2026 has 30 rows and black-friday-fim-do-mundo has 15, with zero overlap in id", async () => {
    const [campaign1, campaign2] = await Promise.all([
      prisma.blackFridayProduct.findMany({ where: { campaign: BLACK_FRIDAY_2026_CAMPAIGN } }),
      prisma.blackFridayProduct.findMany({ where: { campaign: BLACK_FRIDAY_FIM_DO_MUNDO_CAMPAIGN } }),
    ]);
    if (campaign1.length === 0 && campaign2.length === 0) return; // nothing seeded in this environment
    expect(campaign1).toHaveLength(30);
    expect(campaign2).toHaveLength(15);
    const ids1 = new Set(campaign1.map((p) => p.id));
    expect(campaign2.every((p) => !ids1.has(p.id))).toBe(true);
  });

  it("each campaign's real XML route never lists the other campaign's product names", async () => {
    const [xml1, xml2] = await Promise.all([
      blackFriday2026XmlRoute().then((r) => r.text()),
      blackFridayFimDoMundoXmlRoute().then((r) => r.text()),
    ]);
    // Only meaningful once both are seeded with at least one VALIDATED
    // row each — otherwise both are legitimately empty channels.
    const campaign2Products = await prisma.blackFridayProduct.findMany({
      where: { campaign: BLACK_FRIDAY_FIM_DO_MUNDO_CAMPAIGN, status: "VALIDATED" },
      select: { name: true },
    });
    for (const p of campaign2Products) {
      expect(xml1).not.toContain(`<title>${p.name.replace(/&/g, "&amp;")}</title>`);
    }
    const campaign1Products = await prisma.blackFridayProduct.findMany({
      where: { campaign: BLACK_FRIDAY_2026_CAMPAIGN, status: "VALIDATED" },
      select: { name: true },
    });
    for (const p of campaign1Products) {
      expect(xml2).not.toContain(`<title>${p.name.replace(/&/g, "&amp;")}</title>`);
    }
  });
});
