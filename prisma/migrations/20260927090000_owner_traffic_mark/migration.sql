-- Purely additive: a new table. A long-lived, opt-in marker so the owner's
-- everyday browsing (not only while logged into /admin, whose session lasts
-- 12h) never counts in the reports. See lib/admin/owner-traffic.ts. No
-- existing table is touched.
CREATE TABLE "OwnerTrafficMark" (
    "id" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnerTrafficMark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OwnerTrafficMark_tokenHash_key" ON "OwnerTrafficMark"("tokenHash");

-- CreateIndex
CREATE INDEX "OwnerTrafficMark_expiresAt_idx" ON "OwnerTrafficMark"("expiresAt");
