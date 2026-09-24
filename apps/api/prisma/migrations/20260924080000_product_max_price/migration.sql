-- The dearest variant a customer can order, cached on the product beside the cheapest.
--
-- Written by hand: a required column on a table with rows needs a value for every existing row
-- before it can be NOT NULL. Every product whose variants the API has not rewritten since the
-- variants arrived has exactly one, so its price is both ends of its range; a product the options
-- endpoint wrote gets the dearest of what it sells, by the same rule the API applies.
ALTER TABLE "products" ADD COLUMN "maxPriceCents" INTEGER;

UPDATE "products" p SET "maxPriceCents" = COALESCE(
  (SELECT MAX(v."priceCents") FROM "product_variants" v
    WHERE v."productId" = p."id" AND v."archivedAt" IS NULL AND v."isActive"
      AND (NOT v."trackStock" OR COALESCE(v."stockQuantity", 0) > 0)),
  (SELECT MAX(v."priceCents") FROM "product_variants" v
    WHERE v."productId" = p."id" AND v."archivedAt" IS NULL AND v."isActive"),
  (SELECT MAX(v."priceCents") FROM "product_variants" v
    WHERE v."productId" = p."id" AND v."archivedAt" IS NULL),
  p."priceCents"
);

ALTER TABLE "products" ALTER COLUMN "maxPriceCents" SET NOT NULL;
