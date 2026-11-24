-- Expand-only foundation for a future multi-merchant PreçoCaindo.
-- Existing Product/Offer/PriceHistory/AffiliateClick rows remain valid.

CREATE TYPE "MerchantCode" AS ENUM ('AMAZON', 'MERCADO_LIVRE', 'SHOPEE', 'AWIN', 'GENERIC_AFFILIATE');

CREATE TYPE "ExternalIdType" AS ENUM ('ASIN', 'SKU', 'URL', 'MERCHANT_PRODUCT_ID');

CREATE TABLE "CanonicalProduct" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brand" TEXT,
    "model" TEXT,
    "gtin" TEXT,
    "description" TEXT,
    "imageUrl" TEXT,
    "categoryId" TEXT,
    "specifications" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CanonicalProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Merchant" (
    "id" TEXT NOT NULL,
    "code" "MerchantCode" NOT NULL,
    "name" TEXT NOT NULL,
    "homepageUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "affiliateEnabled" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Merchant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MerchantListing" (
    "id" TEXT NOT NULL,
    "canonicalProductId" TEXT,
    "merchantId" TEXT NOT NULL,
    "legacyProductId" TEXT,
    "externalId" TEXT NOT NULL,
    "externalIdType" "ExternalIdType" NOT NULL,
    "marketplace" "Marketplace",
    "productUrl" TEXT NOT NULL,
    "source" "DataSource" NOT NULL DEFAULT 'MANUAL_VERIFIED',
    "availability" "Availability" NOT NULL DEFAULT 'UNKNOWN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantListing_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Product" ADD COLUMN "canonicalProductId" TEXT;
ALTER TABLE "AffiliateClick" ADD COLUMN "canonicalProductId" TEXT;
ALTER TABLE "AffiliateClick" ADD COLUMN "merchantId" TEXT;
ALTER TABLE "AffiliateClick" ADD COLUMN "merchantListingId" TEXT;

CREATE UNIQUE INDEX "CanonicalProduct_slug_key" ON "CanonicalProduct"("slug");
CREATE INDEX "CanonicalProduct_categoryId_idx" ON "CanonicalProduct"("categoryId");
CREATE INDEX "CanonicalProduct_active_idx" ON "CanonicalProduct"("active");

CREATE UNIQUE INDEX "Merchant_code_key" ON "Merchant"("code");

CREATE UNIQUE INDEX "MerchantListing_merchantId_marketplace_externalId_key" ON "MerchantListing"("merchantId", "marketplace", "externalId");
CREATE INDEX "MerchantListing_canonicalProductId_idx" ON "MerchantListing"("canonicalProductId");
CREATE INDEX "MerchantListing_legacyProductId_idx" ON "MerchantListing"("legacyProductId");
CREATE INDEX "MerchantListing_merchantId_active_idx" ON "MerchantListing"("merchantId", "active");

CREATE INDEX "Product_canonicalProductId_idx" ON "Product"("canonicalProductId");
CREATE INDEX "AffiliateClick_canonicalProductId_createdAt_idx" ON "AffiliateClick"("canonicalProductId", "createdAt");
CREATE INDEX "AffiliateClick_merchantId_createdAt_idx" ON "AffiliateClick"("merchantId", "createdAt");
CREATE INDEX "AffiliateClick_merchantListingId_createdAt_idx" ON "AffiliateClick"("merchantListingId", "createdAt");

ALTER TABLE "CanonicalProduct" ADD CONSTRAINT "CanonicalProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AffiliateClick" ADD CONSTRAINT "AffiliateClick_merchantListingId_fkey" FOREIGN KEY ("merchantListingId") REFERENCES "MerchantListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MerchantListing" ADD CONSTRAINT "MerchantListing_canonicalProductId_fkey" FOREIGN KEY ("canonicalProductId") REFERENCES "CanonicalProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MerchantListing" ADD CONSTRAINT "MerchantListing_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MerchantListing" ADD CONSTRAINT "MerchantListing_legacyProductId_fkey" FOREIGN KEY ("legacyProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
