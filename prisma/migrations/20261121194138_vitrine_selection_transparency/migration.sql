-- AlterTable
ALTER TABLE "VitrineSelection" ADD COLUMN     "retiredReason" TEXT;

-- CreateTable
CREATE TABLE "VitrineSelectionRound" (
    "id" TEXT NOT NULL,
    "automationRunId" TEXT,
    "runAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "foundInDatabase" INTEGER NOT NULL,
    "afterDedup" INTEGER NOT NULL,
    "discardedNoPrice" INTEGER NOT NULL,
    "discardedIneligible" INTEGER NOT NULL,
    "evaluated" INTEGER NOT NULL,
    "selected" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VitrineSelectionRound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitrineSelectionRoundCandidate" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "merchantListingId" TEXT NOT NULL,
    "groupType" TEXT,
    "score" DOUBLE PRECISION,
    "scoreBreakdown" JSONB,
    "commissionType" TEXT,
    "commissionFresh" BOOLEAN,
    "commissionEstimatedValueBrl" DOUBLE PRECISION,
    "salesEvidenceType" TEXT,
    "demandScore" INTEGER,
    "trendDirection" TEXT,
    "eligible" BOOLEAN NOT NULL,
    "discardReason" TEXT,
    "discardDetail" TEXT,
    "rankInGroup" INTEGER,
    "finalDecision" TEXT NOT NULL,
    "justification" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VitrineSelectionRoundCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CanonicalProductMergeReview" (
    "id" TEXT NOT NULL,
    "existingCanonicalProductId" TEXT NOT NULL,
    "newCatalogProductId" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "verdict" TEXT NOT NULL,
    "matchedAttributes" JSONB NOT NULL,
    "conflictingAttributes" JSONB NOT NULL,
    "asymmetricAttributes" JSONB NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "reviewDecision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CanonicalProductMergeReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VitrineSelectionRound_runAt_idx" ON "VitrineSelectionRound"("runAt");

-- CreateIndex
CREATE UNIQUE INDEX "VitrineSelectionRound_automationRunId_key" ON "VitrineSelectionRound"("automationRunId");

-- CreateIndex
CREATE INDEX "VitrineSelectionRoundCandidate_roundId_idx" ON "VitrineSelectionRoundCandidate"("roundId");

-- CreateIndex
CREATE INDEX "VitrineSelectionRoundCandidate_merchantListingId_roundId_idx" ON "VitrineSelectionRoundCandidate"("merchantListingId", "roundId");

-- CreateIndex
CREATE INDEX "VitrineSelectionRoundCandidate_roundId_finalDecision_idx" ON "VitrineSelectionRoundCandidate"("roundId", "finalDecision");

-- CreateIndex
CREATE UNIQUE INDEX "CanonicalProductMergeReview_existingCanonicalProductId_new_key" ON "CanonicalProductMergeReview"("existingCanonicalProductId", "newCatalogProductId");

-- CreateIndex
CREATE INDEX "CanonicalProductMergeReview_existingCanonicalProductId_idx" ON "CanonicalProductMergeReview"("existingCanonicalProductId");

-- CreateIndex
CREATE INDEX "CanonicalProductMergeReview_reviewedAt_idx" ON "CanonicalProductMergeReview"("reviewedAt");

-- AddForeignKey
ALTER TABLE "VitrineSelectionRoundCandidate" ADD CONSTRAINT "VitrineSelectionRoundCandidate_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "VitrineSelectionRound"("id") ON DELETE CASCADE ON UPDATE CASCADE;
