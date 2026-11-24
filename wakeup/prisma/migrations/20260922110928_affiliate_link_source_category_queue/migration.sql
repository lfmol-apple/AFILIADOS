-- Purely additive: a new AffiliateLinkSource value for links registered via
-- the newer /admin/fila-links queue (products read off the ML affiliate
-- panel category by category). No existing AffiliateLinkRegistry row is
-- touched — every row already ACTIVE keeps its current source
-- (MANUAL_ADMIN/API/LEGACY), so it stays queryable as the "old" batch,
-- distinct from anything saved through this new value from now on.
ALTER TYPE "AffiliateLinkSource" ADD VALUE 'MANUAL_ADMIN_CATEGORY';
