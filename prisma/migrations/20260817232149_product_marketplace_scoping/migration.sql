-- DropIndex
DROP INDEX "Product_provider_asin_key";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "marketplace" "Marketplace" NOT NULL DEFAULT 'BR';

-- CreateIndex
CREATE INDEX "Product_marketplace_active_idx" ON "Product"("marketplace", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Product_provider_marketplace_asin_key" ON "Product"("provider", "marketplace", "asin");
