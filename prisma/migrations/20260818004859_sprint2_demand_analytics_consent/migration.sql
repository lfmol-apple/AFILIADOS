/*
  Warnings:

  - You are about to drop the column `destinationHash` on the `PriceAlert` table. All the data in the column will be lost.
  - The `intent` column on the `SearchOpportunity` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `contact` to the `PriceAlert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contactHash` to the `PriceAlert` table without a default value. This is not possible if the table is not empty.
  - Added the required column `normalizedKeyword` to the `SearchOpportunity` table without a default value. This is not possible if the table is not empty.
  - Added the required column `source` to the `SearchOpportunity` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "DemandIntent" AS ENUM ('PRODUCT_RESEARCH', 'PRICE', 'DEAL', 'BEST_OF', 'COMPARISON', 'CATEGORY', 'INFORMATIONAL');

-- CreateEnum
CREATE TYPE "ConsentChoice" AS ENUM ('GRANTED', 'DENIED', 'UNSET');

-- AlterTable
ALTER TABLE "GeneratedContent" ADD COLUMN     "contentHash" TEXT,
ADD COLUMN     "demandScoreAtGeneration" DOUBLE PRECISION,
ADD COLUMN     "noindex" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "qualityBreakdown" JSONB;

-- AlterTable
ALTER TABLE "PriceAlert" DROP COLUMN "destinationHash",
ADD COLUMN     "confirmationToken" TEXT,
ADD COLUMN     "confirmedAt" TIMESTAMP(3),
ADD COLUMN     "contact" TEXT NOT NULL,
ADD COLUMN     "contactHash" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "priorityUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SearchOpportunity" ADD COLUMN     "commercialScore" DOUBLE PRECISION,
ADD COLUMN     "contentGapScore" DOUBLE PRECISION,
ADD COLUMN     "demandScore" DOUBLE PRECISION,
ADD COLUMN     "freshnessScore" DOUBLE PRECISION,
ADD COLUMN     "lastEvaluatedAt" TIMESTAMP(3),
ADD COLUMN     "normalizedKeyword" TEXT NOT NULL,
ADD COLUMN     "overallScore" DOUBLE PRECISION,
ADD COLUMN     "source" TEXT NOT NULL,
DROP COLUMN "intent",
ADD COLUMN     "intent" "DemandIntent" NOT NULL DEFAULT 'PRODUCT_RESEARCH';

-- CreateTable
CREATE TABLE "PageView" (
    "id" TEXT NOT NULL,
    "pageType" TEXT NOT NULL,
    "pageSlug" TEXT NOT NULL,
    "productId" TEXT,
    "referrerDomain" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "sessionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchEvent" (
    "id" TEXT NOT NULL,
    "query" TEXT NOT NULL,
    "normalizedQuery" TEXT NOT NULL,
    "resultCount" INTEGER NOT NULL,
    "clickedProductId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlugRedirect" (
    "id" TEXT NOT NULL,
    "oldPath" TEXT NOT NULL,
    "newPath" TEXT NOT NULL,
    "statusCode" INTEGER NOT NULL DEFAULT 301,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlugRedirect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentRecord" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "analytics" "ConsentChoice" NOT NULL DEFAULT 'UNSET',
    "marketing" "ConsentChoice" NOT NULL DEFAULT 'UNSET',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PageView_pageType_pageSlug_createdAt_idx" ON "PageView"("pageType", "pageSlug", "createdAt");

-- CreateIndex
CREATE INDEX "PageView_sessionId_idx" ON "PageView"("sessionId");

-- CreateIndex
CREATE INDEX "PageView_createdAt_idx" ON "PageView"("createdAt");

-- CreateIndex
CREATE INDEX "SearchEvent_normalizedQuery_createdAt_idx" ON "SearchEvent"("normalizedQuery", "createdAt");

-- CreateIndex
CREATE INDEX "SearchEvent_createdAt_idx" ON "SearchEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SlugRedirect_oldPath_key" ON "SlugRedirect"("oldPath");

-- CreateIndex
CREATE INDEX "SlugRedirect_newPath_idx" ON "SlugRedirect"("newPath");

-- CreateIndex
CREATE UNIQUE INDEX "ConsentRecord_subjectId_key" ON "ConsentRecord"("subjectId");

-- CreateIndex
CREATE INDEX "AutomationRun_job_status_idx" ON "AutomationRun"("job", "status");

-- CreateIndex
CREATE INDEX "GeneratedContent_contentHash_idx" ON "GeneratedContent"("contentHash");

-- CreateIndex
CREATE INDEX "PriceAlert_contactHash_idx" ON "PriceAlert"("contactHash");

-- CreateIndex
CREATE INDEX "SearchOpportunity_normalizedKeyword_idx" ON "SearchOpportunity"("normalizedKeyword");

-- AddForeignKey
ALTER TABLE "PageView" ADD CONSTRAINT "PageView_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
