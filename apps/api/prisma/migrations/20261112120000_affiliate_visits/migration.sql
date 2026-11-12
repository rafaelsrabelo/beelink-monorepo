-- IMPULSEIA-105 (plan 2026-11-12--IMPULSEIA-105--link-na-vitrine): an affiliate's visits through
-- their link, one number a day, like the funnel's counters.
-- CreateTable
CREATE TABLE "affiliate_visit_days" (
    "affiliateId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "day" DATE NOT NULL,
    "visits" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "affiliate_visit_days_pkey" PRIMARY KEY ("affiliateId","day")
);

-- CreateIndex
CREATE INDEX "affiliate_visit_days_storeId_day_idx" ON "affiliate_visit_days"("storeId", "day");

-- CreateIndex
CREATE INDEX "affiliate_visit_days_day_idx" ON "affiliate_visit_days"("day");

-- AddForeignKey
ALTER TABLE "affiliate_visit_days" ADD CONSTRAINT "affiliate_visit_days_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "affiliate_visit_days" ADD CONSTRAINT "affiliate_visit_days_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- What the API writes, held where a write that skipped it would land.
ALTER TABLE "affiliate_visit_days" ADD CONSTRAINT "affiliate_visit_days_visits_check" CHECK ("visits" >= 0);
