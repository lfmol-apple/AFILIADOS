-- AlterTable
ALTER TABLE "BlackFridayProduct"
  ADD COLUMN "resolvedProductUrl" TEXT,
  ADD COLUMN "resolvedExternalId" TEXT,
  ADD COLUMN "resolvedTitle" TEXT,
  ADD COLUMN "resolvedAt" TIMESTAMP(3),
  ADD COLUMN "enabled" BOOLEAN NOT NULL DEFAULT true;
