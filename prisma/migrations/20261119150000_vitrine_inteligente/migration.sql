-- CreateTable
CREATE TABLE "MerchantListingTrend" (
    "id" TEXT NOT NULL,
    "merchantListingId" TEXT NOT NULL,
    "rankLatest" INTEGER,
    "rank7dAgo" INTEGER,
    "rank30dAgo" INTEGER,
    "rank90dAgo" INTEGER,
    "direction" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantListingTrend_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "VitrineAdSpend" (
    "id" TEXT NOT NULL,
    "spentOn" TIMESTAMP(3) NOT NULL,
    "amountBrl" DECIMAL(10,2) NOT NULL,
    "note" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VitrineAdSpend_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitrineCommissionReport" (
    "id" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "directAmountBrl" DECIMAL(10,2) NOT NULL,
    "indirectAmountBrl" DECIMAL(10,2) NOT NULL,
    "status" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'manual_ml_panel',
    "note" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VitrineCommissionReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitrineWeightHistory" (
    "id" TEXT NOT NULL,
    "weights" JSONB NOT NULL,
    "reason" TEXT NOT NULL,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VitrineWeightHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MerchantListingTrend_merchantListingId_key" ON "MerchantListingTrend"("merchantListingId");

-- CreateIndex
CREATE INDEX "MerchantListingTrend_direction_idx" ON "MerchantListingTrend"("direction");

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

-- CreateIndex
CREATE INDEX "VitrineAdSpend_spentOn_idx" ON "VitrineAdSpend"("spentOn");

-- CreateIndex
CREATE INDEX "VitrineCommissionReport_periodStart_periodEnd_idx" ON "VitrineCommissionReport"("periodStart", "periodEnd");

-- AddForeignKey
ALTER TABLE "MerchantListingTrend" ADD CONSTRAINT "MerchantListingTrend_merchantListingId_fkey" FOREIGN KEY ("merchantListingId") REFERENCES "MerchantListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitrineLink" ADD CONSTRAINT "VitrineLink_merchantListingId_fkey" FOREIGN KEY ("merchantListingId") REFERENCES "MerchantListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitrineLink" ADD CONSTRAINT "VitrineLink_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VitrineSelection" ADD CONSTRAINT "VitrineSelection_merchantListingId_fkey" FOREIGN KEY ("merchantListingId") REFERENCES "MerchantListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

