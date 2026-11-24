-- Purely additive: a new table. Rows of the ML panel list that can't become a
-- link (same product already live, no catalog id, refused by the Linkbuilder)
-- so the queue stops offering them. No existing table is touched.
CREATE TABLE "MlPanelPickIssue" (
    "panelId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MlPanelPickIssue_pkey" PRIMARY KEY ("panelId")
);
