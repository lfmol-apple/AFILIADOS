-- CreateEnum
CREATE TYPE "BlackFridayProductStatus" AS ENUM ('PENDING_LINK', 'LINK_PASTED', 'VALIDATED', 'DIVERGENT', 'REJECTED');

-- CreateTable
CREATE TABLE "BlackFridayCreative" (
    "id" TEXT NOT NULL,
    "groupKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "storedPath" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlackFridayCreative_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlackFridayProduct" (
    "id" TEXT NOT NULL,
    "slotNumber" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "advertisedPrice" DECIMAL(10,2) NOT NULL,
    "currentPrice" DECIMAL(10,2),
    "mlUrlOriginal" TEXT,
    "affiliateUrl" TEXT,
    "attributionTag" TEXT NOT NULL DEFAULT 'blackfriday2026',
    "status" "BlackFridayProductStatus" NOT NULL DEFAULT 'PENDING_LINK',
    "reviewNote" TEXT,
    "selectedCreativeId" TEXT,
    "destinationCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlackFridayProduct_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlackFridayCreative_sha256_key" ON "BlackFridayCreative"("sha256");

-- CreateIndex
CREATE INDEX "BlackFridayCreative_groupKey_idx" ON "BlackFridayCreative"("groupKey");

-- CreateIndex
CREATE UNIQUE INDEX "BlackFridayProduct_slotNumber_key" ON "BlackFridayProduct"("slotNumber");

-- CreateIndex
CREATE INDEX "BlackFridayProduct_status_idx" ON "BlackFridayProduct"("status");

-- AddForeignKey
ALTER TABLE "BlackFridayProduct" ADD CONSTRAINT "BlackFridayProduct_selectedCreativeId_fkey" FOREIGN KEY ("selectedCreativeId") REFERENCES "BlackFridayCreative"("id") ON DELETE SET NULL ON UPDATE CASCADE;
