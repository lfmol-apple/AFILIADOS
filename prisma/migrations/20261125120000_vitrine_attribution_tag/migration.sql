-- Owner's directive, 2026-11-25 ("investigue... correção do
-- attributionTag... esse campo é estratégico para a implantação da
-- segunda vitrine e para a separação comercial entre vitrines").
-- Additive-only. Never apply to production without separate explicit
-- authorization — same operating rule already followed for every prior
-- Vitrine migration in this project.
--
-- Nullable-first, backfill, then enforce NOT NULL + unique — same safe
-- 3-step pattern already used by
-- 20261122153228_multi_vitrine_core/migration.sql for VitrineSelection.vitrineId.

-- AlterTable: add nullable first (never NOT NULL in the same statement
-- a real existing row would violate).
ALTER TABLE "Vitrine" ADD COLUMN "attributionTag" TEXT;

-- Backfill the one real existing row (the original "Vitrine Geral",
-- id 'vitrine-geral-original') with the EXACT tag its own VitrineLink
-- rows already carry (VitrineLink.attributionTag's own column default)
-- — never a new/different value, never a generic placeholder.
UPDATE "Vitrine" SET "attributionTag" = 'vitrinedinamica' WHERE "slug" = 'vitrine-geral';

-- Enforce NOT NULL now that every real row has a real value.
ALTER TABLE "Vitrine" ALTER COLUMN "attributionTag" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Vitrine_attributionTag_key" ON "Vitrine"("attributionTag");
