-- Rollback for migration 20261119180000_commercial_intelligence_lab.
-- Same procedure as prisma/migrations/20261119150000_vitrine_inteligente/
-- rollback.sql: `prisma migrate resolve --rolled-back` only edits
-- Prisma's bookkeeping, never the physical schema — run THIS script
-- first, then mark it resolved.
--
--   1. pg_dump a fresh backup first regardless.
--   2. psql "$DATABASE_URL" -f prisma/migrations/20261119180000_commercial_intelligence_lab/rollback.sql
--   3. npx prisma migrate resolve --rolled-back 20261119180000_commercial_intelligence_lab
--   4. npx prisma migrate status
--
-- Safe by construction: every statement only removes something THIS
-- migration created. No existing table/row is touched. The two ALTER
-- TABLE ... DROP COLUMN statements only remove the 5 new nullable
-- columns/the 1 new column with a default — none of this migration's
-- own changes can have broken an existing row, since every added column
-- is nullable or has a default.

BEGIN;

DROP TABLE IF EXISTS "CommercialSelectionCheckpoint";
DROP TABLE IF EXISTS "CommercialSelectionItem";
DROP TABLE IF EXISTS "CommercialSelectionSnapshot";
DROP TABLE IF EXISTS "TrendKeywordObservation";

ALTER TABLE "VitrineAdSpend" DROP CONSTRAINT IF EXISTS "VitrineAdSpend_spentOn_source_key";
ALTER TABLE "VitrineAdSpend" DROP COLUMN IF EXISTS "source";

ALTER TABLE "MerchantListingTrend" DROP COLUMN IF EXISTS "bestRankEver";
ALTER TABLE "MerchantListingTrend" DROP COLUMN IF EXISTS "daysInRanking";
ALTER TABLE "MerchantListingTrend" DROP COLUMN IF EXISTS "firstSeenInRankingAt";
ALTER TABLE "MerchantListingTrend" DROP COLUMN IF EXISTS "lastSeenInRankingAt";
ALTER TABLE "MerchantListingTrend" DROP COLUMN IF EXISTS "worstRankEver";

COMMIT;
