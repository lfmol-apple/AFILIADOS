-- CreateEnum
CREATE TYPE "AffiliateLinkSource" AS ENUM ('API', 'MANUAL_ADMIN', 'LEGACY');

-- CreateEnum
CREATE TYPE "AffiliateLinkStatus" AS ENUM ('PENDING', 'ACTIVE', 'INVALID', 'DISABLED');

-- AlterTable
ALTER TABLE "AffiliateClick" ADD COLUMN     "medium" TEXT;

-- CreateTable
CREATE TABLE "AffiliateLinkRegistry" (
    "id" TEXT NOT NULL,
    "merchantListingId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "affiliateUrl" TEXT,
    "attributionProject" TEXT NOT NULL DEFAULT 'PRECOCAINDO',
    "attributionTag" TEXT NOT NULL,
    "source" "AffiliateLinkSource" NOT NULL,
    "status" "AffiliateLinkStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastValidatedAt" TIMESTAMP(3),

    CONSTRAINT "AffiliateLinkRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateLinkRegistry_merchantListingId_key" ON "AffiliateLinkRegistry"("merchantListingId");

-- CreateIndex
CREATE INDEX "AffiliateLinkRegistry_merchantId_status_idx" ON "AffiliateLinkRegistry"("merchantId", "status");

-- CreateIndex
CREATE INDEX "AffiliateLinkRegistry_status_idx" ON "AffiliateLinkRegistry"("status");

-- AddForeignKey
ALTER TABLE "AffiliateLinkRegistry" ADD CONSTRAINT "AffiliateLinkRegistry_merchantListingId_fkey" FOREIGN KEY ("merchantListingId") REFERENCES "MerchantListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateLinkRegistry" ADD CONSTRAINT "AffiliateLinkRegistry_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
