-- BEELINK-331: a page's address may change, at most once every 30 days. "slugChangedAt" is when it
-- last did; "store_slug_history" keeps every address a page left — its own for good, by the key, and
-- led by the web to the address the page has now. Nothing existing is touched: no page has changed
-- its address yet, so the history starts empty and every "slugChangedAt" null.

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "slugChangedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "store_slug_history" (
    "slug" VARCHAR(40) NOT NULL,
    "storeId" UUID NOT NULL,
    "leftAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_slug_history_pkey" PRIMARY KEY ("slug")
);

-- CreateIndex
CREATE INDEX "store_slug_history_storeId_idx" ON "store_slug_history"("storeId");

-- AddForeignKey
ALTER TABLE "store_slug_history" ADD CONSTRAINT "store_slug_history_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;
