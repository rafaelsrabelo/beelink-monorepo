-- A showcase says which products it draws, how, and how many.
--
-- `source` and `limit` are read on PRODUCTS only, and null on every other kind. The category of a
-- CATEGORY showcase is a real foreign key, set null when the category goes, so the showcase asks
-- for another rather than disappearing. A hand-picked selection lives in `items`, the way a slide's
-- target does.
--
-- There is no BEST_SELLERS: nothing records a sale yet. It is one ADD VALUE the day orders exist.
--
-- RAIL is added here and used in the next migration: Postgres refuses a new enum value in the same
-- transaction that adds it.
CREATE TYPE "ProductSource" AS ENUM ('ALL', 'CATEGORY', 'SELECTION', 'NEWEST', 'ON_SALE');

ALTER TYPE "ComponentDisplay" ADD VALUE 'RAIL';

ALTER TABLE "store_components"
ADD COLUMN "source" "ProductSource",
ADD COLUMN "sourceCategoryId" UUID,
ADD COLUMN "limit" INTEGER;

ALTER TABLE "store_components" ADD CONSTRAINT "store_components_sourceCategoryId_fkey" FOREIGN KEY ("sourceCategoryId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
