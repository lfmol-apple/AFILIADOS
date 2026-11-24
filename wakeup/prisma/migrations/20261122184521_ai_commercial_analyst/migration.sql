-- CreateTable
CREATE TABLE "CommercialAnalystEvaluation" (
    "id" TEXT NOT NULL,
    "merchantListingId" TEXT NOT NULL,
    "evidenceFingerprint" TEXT NOT NULL,
    "evidenceSnapshot" JSONB NOT NULL,
    "recommendation" TEXT NOT NULL,
    "commercialScore" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "favorableArguments" JSONB NOT NULL,
    "risks" JSONB NOT NULL,
    "evidenceUsed" JSONB NOT NULL,
    "missingData" JSONB NOT NULL,
    "rawResponseText" TEXT,
    "model" TEXT NOT NULL,
    "promptTokens" INTEGER,
    "completionTokens" INTEGER,
    "costUsd" DECIMAL(8,4),
    "isFallback" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialAnalystEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialAnalystSpend" (
    "id" TEXT NOT NULL,
    "spentOn" TIMESTAMP(3) NOT NULL,
    "amountUsd" DECIMAL(8,4) NOT NULL,
    "evaluationId" TEXT,
    "note" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommercialAnalystSpend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommercialAnalystEvaluation_merchantListingId_idx" ON "CommercialAnalystEvaluation"("merchantListingId");

-- CreateIndex
CREATE INDEX "CommercialAnalystEvaluation_createdAt_idx" ON "CommercialAnalystEvaluation"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CommercialAnalystEvaluation_merchantListingId_evidenceFinge_key" ON "CommercialAnalystEvaluation"("merchantListingId", "evidenceFingerprint");

-- CreateIndex
CREATE INDEX "CommercialAnalystSpend_spentOn_idx" ON "CommercialAnalystSpend"("spentOn");

-- RenameIndex
ALTER INDEX "CanonicalProductMergeReview_existingCanonicalProductId_new_key" RENAME TO "CanonicalProductMergeReview_existingCanonicalProductId_newC_key";
