-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('MOCK', 'MANUAL_VERIFIED', 'AMAZON_API');

-- CreateEnum
CREATE TYPE "CandidateStatus" AS ENUM ('CANDIDATE', 'APPROVED', 'REJECTED', 'PROMOTED');

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "dataSource" "DataSource" NOT NULL DEFAULT 'MOCK';

-- CreateTable
CREATE TABLE "ProductCandidate" (
    "id" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "marketplace" "Marketplace" NOT NULL DEFAULT 'BR',
    "workingTitle" TEXT NOT NULL,
    "categoryHint" TEXT,
    "slugHint" TEXT,
    "rationale" TEXT NOT NULL,
    "searchPotential" INTEGER,
    "purchaseIntent" INTEGER,
    "ticketSize" INTEGER,
    "commissionEstimate" INTEGER,
    "longTailOpportunity" INTEGER,
    "seoCompetitiveness" INTEGER,
    "valuePropositionFit" INTEGER,
    "clickProbability" INTEGER,
    "internalScore" INTEGER,
    "status" "CandidateStatus" NOT NULL DEFAULT 'CANDIDATE',
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCandidate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductCandidate_productId_key" ON "ProductCandidate"("productId");

-- CreateIndex
CREATE INDEX "ProductCandidate_status_idx" ON "ProductCandidate"("status");

-- CreateIndex
CREATE INDEX "ProductCandidate_internalScore_idx" ON "ProductCandidate"("internalScore");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCandidate_asin_marketplace_key" ON "ProductCandidate"("asin", "marketplace");

-- CreateIndex
CREATE INDEX "Product_dataSource_active_idx" ON "Product"("dataSource", "active");

-- AddForeignKey
ALTER TABLE "ProductCandidate" ADD CONSTRAINT "ProductCandidate_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
