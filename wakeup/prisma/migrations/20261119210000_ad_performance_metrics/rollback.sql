-- Rollback for migration 20261119210000_ad_performance_metrics.
-- Same procedure as every other rollback.sql in this project:
--
--   1. pg_dump a fresh backup first regardless.
--   2. psql "$DATABASE_URL" -f prisma/migrations/20261119210000_ad_performance_metrics/rollback.sql
--   3. npx prisma migrate resolve --rolled-back 20261119210000_ad_performance_metrics
--   4. npx prisma migrate status
--
-- Safe by construction: both columns are nullable, added to an existing
-- table — dropping them cannot touch any pre-existing row's other data.

BEGIN;

ALTER TABLE "VitrineAdSpend" DROP COLUMN IF EXISTS "impressions";
ALTER TABLE "VitrineAdSpend" DROP COLUMN IF EXISTS "metaClicks";

COMMIT;
