-- AlterTable
ALTER TABLE "PriceAlert" ADD COLUMN     "merchantListingId" TEXT,
ALTER COLUMN "productId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "PriceAlert_merchantListingId_active_idx" ON "PriceAlert"("merchantListingId", "active");

-- AddForeignKey
ALTER TABLE "PriceAlert" ADD CONSTRAINT "PriceAlert_merchantListingId_fkey" FOREIGN KEY ("merchantListingId") REFERENCES "MerchantListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
