-- CreateTable
CREATE TABLE "VitrineLink" (
    "id" TEXT NOT NULL,
    "merchantListingId" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "affiliateUrl" TEXT,
    "attributionTag" TEXT NOT NULL DEFAULT 'vitrinedinamica',
    "source" "AffiliateLinkSource" NOT NULL,
    "status" "AffiliateLinkStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastValidatedAt" TIMESTAMP(3),

    CONSTRAINT "VitrineLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitrineSelection" (
    "id" TEXT NOT NULL,
    "merchantListingId" TEXT NOT NULL,
    "groupType" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "scoreBreakdown" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "activatedAt" TIMESTAMP(3),
    "retiredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VitrineSelection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VitrineLink_merchantListingId_key" ON "VitrineLink"("merchantListingId");

-- CreateIndex
CREATE INDEX "VitrineLink_merchantId_status_idx" ON "VitrineLink"("merchantId", "status");

-- CreateIndex
CREATE INDEX "VitrineLink_status_idx" ON "VitrineLink"("status");

-- CreateIndex
CREATE UNIQUE INDEX "VitrineSelection_merchantListingId_key" ON "VitrineSelection"("merchantListingId");

-- CreateIndex
CREATE INDEX "VitrineSelection_status_groupType_idx" ON "VitrineSelection"("status", "groupType");

-- AddForeignKey
ALTER TABLE "VitrineLink" ADD CONSTRAINT "VitrineLink_merchantListingId_fkey" FOREIGN KEY ("merchantListingId") REFERENCES "MerchantListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitrineLink" ADD CONSTRAINT "VitrineLink_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitrineSelection" ADD CONSTRAINT "VitrineSelection_merchantListingId_fkey" FOREIGN KEY ("merchantListingId") REFERENCES "MerchantListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
