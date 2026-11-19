-- AlterTable
ALTER TABLE "MerchantListingTrend" ADD COLUMN     "bestRankEver" INTEGER,
ADD COLUMN     "daysInRanking" INTEGER,
ADD COLUMN     "firstSeenInRankingAt" TIMESTAMP(3),
ADD COLUMN     "lastSeenInRankingAt" TIMESTAMP(3),
ADD COLUMN     "worstRankEver" INTEGER;

-- AlterTable
ALTER TABLE "VitrineAdSpend" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'manual';

-- CreateTable
CREATE TABLE "TrendKeywordObservation" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "categoryId" TEXT,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrendKeywordObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialSelectionSnapshot" (
    "id" TEXT NOT NULL,
    "methodology" TEXT NOT NULL,
    "algorithmVersion" TEXT NOT NULL,
    "referenceDate" TIMESTAMP(3) NOT NULL,
    "candidateUniverseSize" INTEGER NOT NULL,
    "discoveredNewCandidates" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialSelectionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialSelectionItem" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "merchantListingId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "scoreAtSelection" DOUBLE PRECISION,
    "evidenceSnapshot" JSONB NOT NULL,

    CONSTRAINT "CommercialSelectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialSelectionCheckpoint" (
    "id" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "checkpointDays" INTEGER NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "results" JSONB,

    CONSTRAINT "CommercialSelectionCheckpoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrendKeywordObservation_keyword_observedAt_idx" ON "TrendKeywordObservation"("keyword", "observedAt");

-- CreateIndex
CREATE INDEX "CommercialSelectionSnapshot_methodology_referenceDate_idx" ON "CommercialSelectionSnapshot"("methodology", "referenceDate");

-- CreateIndex
CREATE INDEX "CommercialSelectionItem_snapshotId_idx" ON "CommercialSelectionItem"("snapshotId");

-- CreateIndex
CREATE INDEX "CommercialSelectionItem_merchantListingId_idx" ON "CommercialSelectionItem"("merchantListingId");

-- CreateIndex
CREATE INDEX "CommercialSelectionCheckpoint_snapshotId_checkpointDays_idx" ON "CommercialSelectionCheckpoint"("snapshotId", "checkpointDays");

-- CreateIndex
CREATE INDEX "CommercialSelectionCheckpoint_dueAt_completedAt_idx" ON "CommercialSelectionCheckpoint"("dueAt", "completedAt");

-- CreateIndex
CREATE UNIQUE INDEX "VitrineAdSpend_spentOn_source_key" ON "VitrineAdSpend"("spentOn", "source");

-- AddForeignKey
ALTER TABLE "CommercialSelectionItem" ADD CONSTRAINT "CommercialSelectionItem_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "CommercialSelectionSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommercialSelectionCheckpoint" ADD CONSTRAINT "CommercialSelectionCheckpoint_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "CommercialSelectionSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
