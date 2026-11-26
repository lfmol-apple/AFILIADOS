-- AlterTable: new default for future rows
ALTER TABLE "BlackFridayProduct" ALTER COLUMN "attributionTag" SET DEFAULT 'blackfriday';

-- Data fix: the real tag used in the Linkbuilder was "blackfriday" (no
-- "2026" suffix) — this is a pure administrative-record update, never
-- touching mlUrlOriginal/affiliateUrl.
UPDATE "BlackFridayProduct" SET "attributionTag" = 'blackfriday' WHERE "attributionTag" = 'blackfriday2026';
