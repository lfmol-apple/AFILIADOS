-- AlterTable
ALTER TABLE "CanonicalProduct" ADD COLUMN "publicSlug" TEXT;

-- AlterTable
ALTER TABLE "MerchantListing" ADD COLUMN "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "CanonicalProduct_publicSlug_key" ON "CanonicalProduct"("publicSlug");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantListing_slug_key" ON "MerchantListing"("slug");
