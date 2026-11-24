-- Rollback for migration 20261119220000_vitrine_creative_factory.
-- Same procedure as every other rollback.sql in this project:
--
--   1. pg_dump a fresh backup first regardless.
--   2. psql "$DATABASE_URL" -f prisma/migrations/20261119220000_vitrine_creative_factory/rollback.sql
--   3. npx prisma migrate resolve --rolled-back 20261119220000_vitrine_creative_factory
--   4. npx prisma migrate status
--
-- Safe by construction: this migration only CREATED two new tables and
-- one new foreign key pointing AT one of them (not from any pre-existing
-- table's column) — dropping them cannot touch any pre-existing row.

BEGIN;

ALTER TABLE "VitrineCreative" DROP CONSTRAINT IF EXISTS "VitrineCreative_merchantListingId_fkey";
DROP TABLE IF EXISTS "VitrineCreativeSpend";
DROP TABLE IF EXISTS "VitrineCreative";

COMMIT;
