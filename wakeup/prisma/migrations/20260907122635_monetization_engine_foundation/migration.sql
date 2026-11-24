-- CreateEnum
CREATE TYPE "MatchMethod" AS ENUM ('GTIN', 'MANUFACTURER_ID', 'BRAND_MODEL', 'TEXTUAL_CANDIDATE');

-- CreateEnum
CREATE TYPE "MatchStatus" AS ENUM ('CANDIDATE', 'CONFIRMED', 'REJECTED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CommerceProviderName" ADD VALUE 'MERCADO_LIVRE';
ALTER TYPE "CommerceProviderName" ADD VALUE 'SHOPEE';

-- CreateTable
CREATE TABLE "ProductMatchEvidence" (
    "id" TEXT NOT NULL,
    "listingAId" TEXT NOT NULL,
    "listingBId" TEXT NOT NULL,
    "method" "MatchMethod" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "status" "MatchStatus" NOT NULL DEFAULT 'CANDIDATE',
    "evidence" JSONB NOT NULL,
    "canonicalProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMatchEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantListingSignal" (
    "id" TEXT NOT NULL,
    "merchantListingId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "commissionRate" DOUBLE PRECISION,
    "estimatedCommissionAmount" DECIMAL(10,2),
    "sellerExtraCommission" DECIMAL(10,2),
    "soldQuantity" INTEGER,
    "trendRank" INTEGER,
    "bestsellerRank" INTEGER,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "raw" JSONB,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantListingSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonetizationScore" (
    "id" TEXT NOT NULL,
    "merchantListingId" TEXT NOT NULL,
    "score" INTEGER,
    "confidence" DOUBLE PRECISION,
    "components" JSONB NOT NULL,
    "reasons" JSONB NOT NULL,
    "missingSignals" JSONB NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MonetizationScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductMatchEvidence_status_idx" ON "ProductMatchEvidence"("status");

-- CreateIndex
CREATE INDEX "ProductMatchEvidence_canonicalProductId_idx" ON "ProductMatchEvidence"("canonicalProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMatchEvidence_listingAId_listingBId_key" ON "ProductMatchEvidence"("listingAId", "listingBId");

-- CreateIndex
CREATE INDEX "MerchantListingSignal_merchantListingId_observedAt_idx" ON "MerchantListingSignal"("merchantListingId", "observedAt");

-- CreateIndex
CREATE INDEX "MerchantListingSignal_source_observedAt_idx" ON "MerchantListingSignal"("source", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "MonetizationScore_merchantListingId_key" ON "MonetizationScore"("merchantListingId");

-- CreateIndex
CREATE INDEX "MonetizationScore_score_idx" ON "MonetizationScore"("score");

-- AddForeignKey
ALTER TABLE "ProductMatchEvidence" ADD CONSTRAINT "ProductMatchEvidence_listingAId_fkey" FOREIGN KEY ("listingAId") REFERENCES "MerchantListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMatchEvidence" ADD CONSTRAINT "ProductMatchEvidence_listingBId_fkey" FOREIGN KEY ("listingBId") REFERENCES "MerchantListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMatchEvidence" ADD CONSTRAINT "ProductMatchEvidence_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantListingSignal" ADD CONSTRAINT "MerchantListingSignal_merchantListingId_fkey" FOREIGN KEY ("merchantListingId") REFERENCES "MerchantListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonetizationScore" ADD CONSTRAINT "MonetizationScore_merchantListingId_fkey" FOREIGN KEY ("merchantListingId") REFERENCES "MerchantListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
