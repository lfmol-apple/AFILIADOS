-- Rollback for migration 20261119200000_commercial_candidate_registry.
-- Same procedure as every other rollback.sql in this project:
--
--   1. pg_dump a fresh backup first regardless.
--   2. psql "$DATABASE_URL" -f prisma/migrations/20261119200000_commercial_candidate_registry/rollback.sql
--   3. npx prisma migrate resolve --rolled-back 20261119200000_commercial_candidate_registry
--   4. npx prisma migrate status
--
-- Safe by construction: this migration only CREATED a new table and one
-- new nullable foreign key pointing AT it (not from any existing table's
-- column) — dropping it cannot touch any pre-existing row or table.

BEGIN;

ALTER TABLE "CommercialCandidateRegistry" DROP CONSTRAINT IF EXISTS "CommercialCandidateRegistry_merchantListingId_fkey";
DROP TABLE IF EXISTS "CommercialCandidateRegistry";

COMMIT;
