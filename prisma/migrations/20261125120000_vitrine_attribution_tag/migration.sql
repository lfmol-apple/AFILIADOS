-- Owner's directive, 2026-11-25 ("investigue... correção do
-- attributionTag... esse campo é estratégico para a implantação da
-- segunda vitrine e para a separação comercial entre vitrines").
-- Additive-only. Never apply to production without separate explicit
-- authorization — same operating rule already followed for every prior
-- Vitrine migration in this project. Applied with `prisma migrate
-- deploy` only — never `prisma db push` (that is exactly the
-- undocumented command that caused this field to drift locally in the
-- first place; see this migration's own commit message).
--
-- Nullable-first, backfill, then enforce NOT NULL + unique — same safe
-- 3-step pattern already used by
-- 20261122153228_multi_vitrine_core/migration.sql for VitrineSelection.vitrineId.
--
-- Documented precondition, verified by direct read-only query against
-- production before writing this migration (2026-11-25): production's
-- "Vitrine" table has EXACTLY ONE real row today — id
-- 'vitrine-geral-original', slug 'vitrine-geral'. The backfill below
-- targets that one row by its real, stable slug, never a generic "all
-- rows" assumption.

-- AlterTable: add nullable first (never NOT NULL in the same statement
-- a real existing row would violate).
ALTER TABLE "Vitrine" ADD COLUMN "attributionTag" TEXT;

-- Backfill the one real existing row (the original "Vitrine Geral",
-- id 'vitrine-geral-original') with the EXACT tag its own VitrineLink
-- rows already carry (VitrineLink.attributionTag's own column default)
-- — never a new/different value, never a generic placeholder.
UPDATE "Vitrine" SET "attributionTag" = 'vitrinedinamica' WHERE "slug" = 'vitrine-geral';

-- Explicit precondition guard: fail loudly, with a real explanation,
-- if any row is about to be left without a tag — rather than relying
-- on the NOT NULL constraint below to fail with an opaque, generic
-- Postgres error. This never invents a tag for an unexpected row; it
-- refuses to proceed and names exactly which row needs a human
-- decision instead.
DO $$
DECLARE
  orphaned_count integer;
  orphaned_ids text;
BEGIN
  SELECT count(*), string_agg(id, ', ')
    INTO orphaned_count, orphaned_ids
    FROM "Vitrine"
    WHERE "attributionTag" IS NULL;

  IF orphaned_count > 0 THEN
    RAISE EXCEPTION
      'Migration 20261125120000_vitrine_attribution_tag refused: % Vitrine row(s) have no attributionTag after the backfill (ids: %). This migration only backfills slug=''vitrine-geral'' — a real second vitrine must already have been given its own deliberate, unique attributionTag by the application before this migration runs. Resolve manually (set a real tag per row) and re-run, never with a generated/generic value.',
      orphaned_count, orphaned_ids;
  END IF;
END $$;

-- Enforce NOT NULL now that every real row has a real value.
ALTER TABLE "Vitrine" ALTER COLUMN "attributionTag" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Vitrine_attributionTag_key" ON "Vitrine"("attributionTag");
