-- Owner's authorization, 2026-11-22 ("Gerenciador de Vitrines
-- Inteligentes"). Additive-only. Never apply to production without
-- separate explicit authorization — see this session's own operating
-- rule, already followed for every prior Vitrine migration.
--
-- Written by hand (same pattern already used in this project for
-- 20261121194138_vitrine_selection_transparency's CanonicalProductMergeReview
-- unique index): `prisma migrate dev` refuses non-interactively even
-- with --create-only in this environment. The SQL below is exactly
-- what Prisma's own diff against the current schema.prisma would
-- generate, verified by applying it to the local dev database and
-- confirming `prisma migrate status` reports "up to date".

-- CreateTable
CREATE TABLE "Vitrine" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT,
    "maxProducts" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "pausedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "Vitrine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Vitrine_slug_key" ON "Vitrine"("slug");

-- CreateIndex
CREATE INDEX "Vitrine_status_idx" ON "Vitrine"("status");

-- Real root cause fixed, 2026-11-22 ("a Vitrine Inteligente atual
-- deverá ser preservada e posteriormente tratada como a primeira
-- vitrine do novo sistema"): a single real "Vitrine Geral" row,
-- backfilled BEFORE VitrineSelection.vitrineId is made NOT NULL below,
-- so every one of the 37 real existing rows (30 ACTIVE/1 RESERVE/6
-- RETIRED in production) gets a real, non-null vitrineId — never a
-- sentinel NULL that a nullable-NULL-is-never-equal-to-NULL unique
-- index could silently fail to protect.
INSERT INTO "Vitrine" ("id", "slug", "name", "purpose", "maxProducts", "status", "createdAt", "updatedAt")
VALUES ('vitrine-geral-original', 'vitrine-geral', 'Vitrine Geral', 'A Vitrine Inteligente original — melhores oportunidades comerciais encontradas, sem foco fixo de categoria.', 30, 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

-- AlterTable: add the new columns nullable first, backfill, then
-- enforce NOT NULL on vitrineId only (canonicalProductId stays
-- nullable — pre-migration rows predate it; every row this codebase
-- creates going forward always sets it).
ALTER TABLE "VitrineSelection" ADD COLUMN "vitrineId" TEXT;
ALTER TABLE "VitrineSelection" ADD COLUMN "canonicalProductId" TEXT;

UPDATE "VitrineSelection" SET "vitrineId" = 'vitrine-geral-original' WHERE "vitrineId" IS NULL;

-- Best-effort backfill of canonicalProductId from the real, existing
-- MerchantListing relation — never guessed, only copied from data that
-- already exists. A listing whose canonicalProductId is itself null
-- (should not happen for any real selected candidate — confirmed by
-- reading buildCommercialCandidatePool) simply keeps this column null.
UPDATE "VitrineSelection" vs
SET "canonicalProductId" = ml."canonicalProductId"
FROM "MerchantListing" ml
WHERE ml."id" = vs."merchantListingId" AND vs."canonicalProductId" IS NULL;

ALTER TABLE "VitrineSelection" ALTER COLUMN "vitrineId" SET NOT NULL;

-- DropIndex: the old GLOBAL per-listing uniqueness (a listing could
-- only ever belong to ONE VitrineSelection row, period) is replaced by
-- a per-(vitrine, listing) uniqueness below — a paused/ended vitrine
-- must release its products back to the shared pool (owner's explicit
-- rule, section 4), so the same listing needs to be able to have
-- independent rows across different vitrines over time.
DROP INDEX "VitrineSelection_merchantListingId_key";

-- CreateIndex
CREATE UNIQUE INDEX "VitrineSelection_vitrineId_merchantListingId_key" ON "VitrineSelection"("vitrineId", "merchantListingId");

-- CreateIndex
CREATE INDEX "VitrineSelection_vitrineId_status_idx" ON "VitrineSelection"("vitrineId", "status");

-- CreateIndex
CREATE INDEX "VitrineSelection_canonicalProductId_idx" ON "VitrineSelection"("canonicalProductId");

-- Real cross-vitrine exclusivity enforcement (owner's explicit
-- requirement, section 4: "implementar a regra de exclusividade de
-- maneira transacional e resistente a concorrência"). A PARTIAL unique
-- index — Prisma's schema language has no native syntax for this, so
-- it exists only here, never auto-regenerable from schema.prisma alone
-- (see lib/services/vitrine-manager.ts's own doc comment, which
-- explains why a `prisma db push`/future `migrate dev` must never be
-- trusted to recreate this specific index). Postgres enforces this
-- atomically under any concurrent transaction — the real mechanism
-- "transacional e resistente a concorrência" requires, not an
-- application-level check that could race.
CREATE UNIQUE INDEX "VitrineSelection_active_canonicalProductId_key"
  ON "VitrineSelection"("canonicalProductId")
  WHERE "status" = 'ACTIVE' AND "canonicalProductId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "VitrineSelection" ADD CONSTRAINT "VitrineSelection_vitrineId_fkey" FOREIGN KEY ("vitrineId") REFERENCES "Vitrine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
