-- CreateEnum
CREATE TYPE "AmazonMatchStatus" AS ENUM ('MATCHED', 'NO_MATCH');

-- CreateTable
CREATE TABLE "AmazonMatch" (
    "id" TEXT NOT NULL,
    "merchantListingId" TEXT NOT NULL,
    "status" "AmazonMatchStatus" NOT NULL,
    "amazonProductId" TEXT,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AmazonMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AmazonMatch_merchantListingId_key" ON "AmazonMatch"("merchantListingId");

-- CreateIndex
CREATE INDEX "AmazonMatch_amazonProductId_idx" ON "AmazonMatch"("amazonProductId");

-- AddForeignKey
ALTER TABLE "AmazonMatch" ADD CONSTRAINT "AmazonMatch_merchantListingId_fkey" FOREIGN KEY ("merchantListingId") REFERENCES "MerchantListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AmazonMatch" ADD CONSTRAINT "AmazonMatch_amazonProductId_fkey" FOREIGN KEY ("amazonProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
