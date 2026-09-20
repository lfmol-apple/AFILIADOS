import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  currentlyVisibleDataSources: vi.fn(),
  getUnifiedMerchantOffers: vi.fn(),
}));

vi.mock("@/lib/config/public-catalog", () => ({
  currentlyVisibleDataSources: mocks.currentlyVisibleDataSources,
}));

vi.mock("@/lib/queries/unified-offers", () => ({
  getUnifiedMerchantOffers: mocks.getUnifiedMerchantOffers,
}));

import { isOffersPageIndexable } from "@/lib/seo/offers-indexability";

describe("isOffersPageIndexable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("is indexable when an Amazon/Product data source is visible", async () => {
    mocks.currentlyVisibleDataSources.mockReturnValue(["MANUAL_VERIFIED"]);

    await expect(isOffersPageIndexable()).resolves.toBe(true);
    expect(mocks.getUnifiedMerchantOffers).not.toHaveBeenCalled();
  });

  it("is indexable when real merchant offers are visible", async () => {
    mocks.currentlyVisibleDataSources.mockReturnValue([]);
    mocks.getUnifiedMerchantOffers.mockResolvedValue([{ id: "offer-1" }]);

    await expect(isOffersPageIndexable()).resolves.toBe(true);
    expect(mocks.getUnifiedMerchantOffers).toHaveBeenCalledWith(1);
  });

  it("is not indexable when no public catalog or merchant offers are visible", async () => {
    mocks.currentlyVisibleDataSources.mockReturnValue([]);
    mocks.getUnifiedMerchantOffers.mockResolvedValue([]);

    await expect(isOffersPageIndexable()).resolves.toBe(false);
  });
});
