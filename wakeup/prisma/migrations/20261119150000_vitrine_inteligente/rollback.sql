-- Rollback for migration 20261119150000_vitrine_inteligente.
--
-- `prisma migrate resolve --rolled-back` ONLY edits Prisma's own
-- _prisma_migrations bookkeeping table — it does NOT touch the actual
-- schema. Running it alone leaves these 6 tables physically in place,
-- out of sync with what Prisma believes the schema is. Use THIS script to
-- actually undo the physical change, then mark it resolved.
--
-- Safe by construction: every statement here only removes something this
-- migration itself created. No existing table (Product, MerchantListing,
-- AffiliateLinkRegistry, AffiliateClick, etc.) is touched, altered, or
-- has a row deleted. Order matters — children before parents, respecting
-- the foreign keys this migration added.
--
-- Procedure:
--   1. pg_dump a fresh backup first regardless (standard practice before
--      any production DDL, rollback included).
--   2. Run this script against the database:
--        psql "$DATABASE_URL" -f prisma/migrations/20261119150000_vitrine_inteligente/rollback.sql
--   3. Tell Prisma the migration is no longer applied:
--        npx prisma migrate resolve --rolled-back 20261119150000_vitrine_inteligente
--   4. Confirm with `npx prisma migrate status` that the schema and
--      Prisma's bookkeeping now agree.

BEGIN;

DROP TABLE IF EXISTS "VitrineWeightHistory";
DROP TABLE IF EXISTS "VitrineCommissionReport";
DROP TABLE IF EXISTS "VitrineAdSpend";
DROP TABLE IF EXISTS "VitrineSelection";
DROP TABLE IF EXISTS "VitrineLink";
DROP TABLE IF EXISTS "MerchantListingTrend";

COMMIT;
