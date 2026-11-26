-- AlterTable: add "campaign", defaulting existing rows to the first
-- campaign so nothing already seeded ever changes meaning.
ALTER TABLE "BlackFridayCreative" ADD COLUMN "campaign" TEXT NOT NULL DEFAULT 'black-friday-2026';
ALTER TABLE "BlackFridayProduct" ADD COLUMN "campaign" TEXT NOT NULL DEFAULT 'black-friday-2026';

-- DropIndex: groupKey alone is replaced by (campaign, groupKey).
DROP INDEX "BlackFridayCreative_groupKey_idx";
CREATE INDEX "BlackFridayCreative_campaign_groupKey_idx" ON "BlackFridayCreative"("campaign", "groupKey");

-- DropIndex: slotNumber alone can no longer be globally unique once a
-- second campaign also numbers its own products starting at 1.
DROP INDEX "BlackFridayProduct_slotNumber_key";
CREATE UNIQUE INDEX "BlackFridayProduct_campaign_slotNumber_key" ON "BlackFridayProduct"("campaign", "slotNumber");

DROP INDEX "BlackFridayProduct_status_idx";
CREATE INDEX "BlackFridayProduct_campaign_status_idx" ON "BlackFridayProduct"("campaign", "status");
