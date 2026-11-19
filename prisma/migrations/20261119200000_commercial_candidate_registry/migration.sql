-- CreateTable
CREATE TABLE "CommercialCandidateRegistry" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "marketplace" "Marketplace" NOT NULL DEFAULT 'BR',
    "merchantListingId" TEXT,
    "sourceType" TEXT NOT NULL,
    "sourceDetail" JSONB NOT NULL,
    "categoryId" TEXT,
    "unresolvedReason" TEXT,
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialCandidateRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommercialCandidateRegistry_externalId_marketplace_idx" ON "CommercialCandidateRegistry"("externalId", "marketplace");

-- CreateIndex
CREATE INDEX "CommercialCandidateRegistry_merchantListingId_idx" ON "CommercialCandidateRegistry"("merchantListingId");

-- CreateIndex
CREATE INDEX "CommercialCandidateRegistry_sourceType_discoveredAt_idx" ON "CommercialCandidateRegistry"("sourceType", "discoveredAt");

-- CreateIndex
CREATE INDEX "CommercialCandidateRegistry_categoryId_idx" ON "CommercialCandidateRegistry"("categoryId");

-- AddForeignKey
ALTER TABLE "CommercialCandidateRegistry" ADD CONSTRAINT "CommercialCandidateRegistry_merchantListingId_fkey" FOREIGN KEY ("merchantListingId") REFERENCES "MerchantListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
