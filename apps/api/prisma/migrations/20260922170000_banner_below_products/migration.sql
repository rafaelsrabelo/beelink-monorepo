-- A poster may now sit under the product bands instead of above them.
--
-- False for every existing row, which is what the landing page already draws: the showcase band
-- has always come before the rails, so the default is not a choice, it is the present behaviour
-- written down.
ALTER TABLE "store_banners" ADD COLUMN "belowProducts" BOOLEAN NOT NULL DEFAULT false;

-- The storefront reads one side at a time, in order.
DROP INDEX IF EXISTS "store_banners_storeId_isActive_position_idx";
CREATE INDEX "store_banners_storeId_isActive_belowProducts_position_idx"
  ON "store_banners" ("storeId", "isActive", "belowProducts", "position");
