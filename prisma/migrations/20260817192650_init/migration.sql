-- CreateEnum
CREATE TYPE "CommerceProviderName" AS ENUM ('AMAZON');

-- CreateEnum
CREATE TYPE "Availability" AS ENUM ('IN_STOCK', 'OUT_OF_STOCK', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('PRODUCT', 'BEST_OF', 'COMPARISON', 'CATEGORY', 'DEAL_SUMMARY');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'VALIDATING', 'APPROVED', 'REJECTED', 'PUBLISHED', 'STALE');

-- CreateEnum
CREATE TYPE "OpportunityStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'DISCARDED');

-- CreateEnum
CREATE TYPE "AutomationStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "UpdatePriority" AS ENUM ('HOT', 'WARM', 'COLD');

-- CreateEnum
CREATE TYPE "AlertChannel" AS ENUM ('EMAIL');

-- CreateEnum
CREATE TYPE "CreativeType" AS ENUM ('PRICE_DROP', 'OPPORTUNITY', 'BEST_OF');

-- CreateEnum
CREATE TYPE "CreativeFormat" AS ENUM ('OG_IMAGE', 'INSTAGRAM_FEED', 'INSTAGRAM_STORY', 'PINTEREST');

-- CreateEnum
CREATE TYPE "CreativeStatus" AS ENUM ('DRAFT', 'READY', 'PUBLISHED', 'ARCHIVED');

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "parentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "provider" "CommerceProviderName" NOT NULL DEFAULT 'AMAZON',
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "categoryId" TEXT,
    "specifications" JSONB,
    "rating" DOUBLE PRECISION,
    "reviewCount" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "updatePriority" "UpdatePriority" NOT NULL DEFAULT 'COLD',
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Offer" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "provider" "CommerceProviderName" NOT NULL DEFAULT 'AMAZON',
    "price" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'BRL',
    "originalPrice" DECIMAL(10,2),
    "discountPercentage" DOUBLE PRECISION,
    "affiliateUrl" TEXT NOT NULL,
    "availability" "Availability" NOT NULL DEFAULT 'UNKNOWN',
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Offer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "provider" "CommerceProviderName" NOT NULL DEFAULT 'AMAZON',
    "price" DECIMAL(10,2) NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceStats" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currentPrice" DECIMAL(10,2) NOT NULL,
    "lowestPrice" DECIMAL(10,2) NOT NULL,
    "highestPrice" DECIMAL(10,2) NOT NULL,
    "avg7d" DECIMAL(10,2),
    "avg30d" DECIMAL(10,2),
    "avg90d" DECIMAL(10,2),
    "dropPercentage" DOUBLE PRECISION,
    "distanceFromLow" DOUBLE PRECISION,
    "historicalPosition" DOUBLE PRECISION,
    "dataPointCount" INTEGER NOT NULL DEFAULT 0,
    "coverageDays" INTEGER NOT NULL DEFAULT 0,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpportunityScore" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "priceScore" INTEGER NOT NULL,
    "discountScore" INTEGER NOT NULL,
    "popularityScore" INTEGER NOT NULL,
    "ratingScore" INTEGER NOT NULL,
    "historicalScore" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "calculatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AffiliateClick" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "provider" "CommerceProviderName" NOT NULL DEFAULT 'AMAZON',
    "pageType" TEXT NOT NULL,
    "pageSlug" TEXT NOT NULL,
    "source" TEXT,
    "campaign" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateClick_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeneratedContent" (
    "id" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "entityId" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metaTitle" TEXT NOT NULL,
    "metaDescription" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "qualityScore" INTEGER,
    "qualityReasons" JSONB,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GeneratedContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchOpportunity" (
    "id" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "intent" TEXT NOT NULL,
    "category" TEXT,
    "productId" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "OpportunityStatus" NOT NULL DEFAULT 'PENDING',
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRun" (
    "id" TEXT NOT NULL,
    "job" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "status" "AutomationStatus" NOT NULL DEFAULT 'RUNNING',
    "processed" INTEGER NOT NULL DEFAULT 0,
    "created" INTEGER NOT NULL DEFAULT 0,
    "updated" INTEGER NOT NULL DEFAULT 0,
    "errors" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceAlert" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "targetPrice" DECIMAL(10,2) NOT NULL,
    "channel" "AlertChannel" NOT NULL DEFAULT 'EMAIL',
    "destinationHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "triggeredAt" TIMESTAMP(3),

    CONSTRAINT "PriceAlert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Creative" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "type" "CreativeType" NOT NULL,
    "format" "CreativeFormat" NOT NULL,
    "headline" TEXT NOT NULL,
    "subtitle" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "previousPrice" DECIMAL(10,2),
    "discount" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "destinationUrl" TEXT NOT NULL,
    "status" "CreativeStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Creative_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_updatePriority_idx" ON "Product"("updatePriority");

-- CreateIndex
CREATE INDEX "Product_active_idx" ON "Product"("active");

-- CreateIndex
CREATE UNIQUE INDEX "Product_provider_asin_key" ON "Product"("provider", "asin");

-- CreateIndex
CREATE INDEX "Offer_productId_observedAt_idx" ON "Offer"("productId", "observedAt");

-- CreateIndex
CREATE INDEX "PriceHistory_productId_observedAt_idx" ON "PriceHistory"("productId", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PriceStats_productId_key" ON "PriceStats"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "OpportunityScore_productId_key" ON "OpportunityScore"("productId");

-- CreateIndex
CREATE INDEX "OpportunityScore_score_idx" ON "OpportunityScore"("score");

-- CreateIndex
CREATE INDEX "AffiliateClick_productId_createdAt_idx" ON "AffiliateClick"("productId", "createdAt");

-- CreateIndex
CREATE INDEX "AffiliateClick_createdAt_idx" ON "AffiliateClick"("createdAt");

-- CreateIndex
CREATE INDEX "GeneratedContent_status_idx" ON "GeneratedContent"("status");

-- CreateIndex
CREATE INDEX "GeneratedContent_entityId_idx" ON "GeneratedContent"("entityId");

-- CreateIndex
CREATE UNIQUE INDEX "GeneratedContent_contentType_slug_key" ON "GeneratedContent"("contentType", "slug");

-- CreateIndex
CREATE INDEX "SearchOpportunity_status_priority_idx" ON "SearchOpportunity"("status", "priority");

-- CreateIndex
CREATE INDEX "AutomationRun_job_startedAt_idx" ON "AutomationRun"("job", "startedAt");

-- CreateIndex
CREATE INDEX "PriceAlert_productId_active_idx" ON "PriceAlert"("productId", "active");

-- CreateIndex
CREATE INDEX "Creative_productId_status_idx" ON "Creative"("productId", "status");

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offer" ADD CONSTRAINT "Offer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceHistory" ADD CONSTRAINT "PriceHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceStats" ADD CONSTRAINT "PriceStats_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityScore" ADD CONSTRAINT "OpportunityScore_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchOpportunity" ADD CONSTRAINT "SearchOpportunity_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Creative" ADD CONSTRAINT "Creative_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
