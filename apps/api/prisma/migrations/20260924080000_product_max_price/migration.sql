-- The dearest variant a customer can order, cached on the product beside the cheapest — and the
-- cheapest recomputed by the rule that now picks it.
--
-- Written by hand: a required column on a table with rows needs a value for every existing row
-- before it can be NOT NULL. The cache used to price a product at its cheapest variant on sale,
-- sold out or not; it is now the cheapest one that can be ordered. A product the options endpoint
-- wrote before this migration would otherwise keep a sold-out variant as the bottom of its range,
-- so the three price columns are rewritten together, from one pool per product: the variants that
-- can be ordered, else the ones on sale, else every current one — what `productCacheOf` does, ties
-- broken by position as it does. A product with one variant gets its own price back unchanged.
ALTER TABLE "products" ADD COLUMN "maxPriceCents" INTEGER;

UPDATE "products" p
SET "priceCents" = c."priceCents", "compareAtPriceCents" = c."compareAtPriceCents", "maxPriceCents" = c."maxPriceCents"
FROM (
  SELECT DISTINCT ON (pool."productId")
    pool."productId",
    pool."priceCents",
    pool."compareAtPriceCents",
    MAX(pool."priceCents") OVER (PARTITION BY pool."productId") AS "maxPriceCents"
  FROM (
    SELECT tiered.*, MIN(tiered.tier) OVER (PARTITION BY tiered."productId") AS best
    FROM (
      SELECT v.*,
        CASE
          WHEN v."isActive" AND (NOT v."trackStock" OR COALESCE(v."stockQuantity", 0) > 0) THEN 1
          WHEN v."isActive" THEN 2
          ELSE 3
        END AS tier
      FROM "product_variants" v
      WHERE v."archivedAt" IS NULL
    ) tiered
  ) pool
  WHERE pool.tier = pool.best
  ORDER BY pool."productId", pool."priceCents", pool."position", pool."id"
) c
WHERE c."productId" = p."id";

-- A product with no current variant cannot exist, but a NOT NULL must not depend on it.
UPDATE "products" SET "maxPriceCents" = "priceCents" WHERE "maxPriceCents" IS NULL;

ALTER TABLE "products" ALTER COLUMN "maxPriceCents" SET NOT NULL;
