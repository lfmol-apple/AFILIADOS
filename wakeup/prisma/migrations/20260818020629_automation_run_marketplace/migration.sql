-- CreateEnum
CREATE TYPE "Marketplace" AS ENUM ('BR', 'US');

-- AlterTable
ALTER TABLE "AutomationRun" ADD COLUMN     "marketplace" "Marketplace";

-- CreateIndex
CREATE INDEX "AutomationRun_job_marketplace_startedAt_idx" ON "AutomationRun"("job", "marketplace", "startedAt");
