-- CreateTable
CREATE TABLE "VitrineCreative" (
    "id" TEXT NOT NULL,
    "merchantListingId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "originalPhotoUrl" TEXT NOT NULL,
    "aiBaseImageUrl" TEXT,
    "finalImageUrl" TEXT NOT NULL,
    "promptInputs" JSONB NOT NULL,
    "promptText" TEXT,
    "model" TEXT NOT NULL,
    "costUsd" DECIMAL(8,4),
    "qualityStatus" TEXT NOT NULL DEFAULT 'pending',
    "qualityNotes" TEXT,
    "publishedAt" TIMESTAMP(3),
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VitrineCreative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VitrineCreativeSpend" (
    "id" TEXT NOT NULL,
    "spentOn" TIMESTAMP(3) NOT NULL,
    "amountUsd" DECIMAL(8,4) NOT NULL,
    "creativeId" TEXT,
    "note" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VitrineCreativeSpend_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VitrineCreative_merchantListingId_kind_version_idx" ON "VitrineCreative"("merchantListingId", "kind", "version");

-- CreateIndex
CREATE INDEX "VitrineCreative_qualityStatus_idx" ON "VitrineCreative"("qualityStatus");

-- CreateIndex
CREATE INDEX "VitrineCreativeSpend_spentOn_idx" ON "VitrineCreativeSpend"("spentOn");

-- AddForeignKey
ALTER TABLE "VitrineCreative" ADD CONSTRAINT "VitrineCreative_merchantListingId_fkey" FOREIGN KEY ("merchantListingId") REFERENCES "MerchantListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
