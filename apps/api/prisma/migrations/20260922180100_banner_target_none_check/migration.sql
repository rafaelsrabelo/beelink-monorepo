-- The constraint learns the fourth target.
--
-- NONE holds no destination at all — not a category, not a product, not an address — which is the
-- whole of what it means. A poster that says "entrega em todo o Brasil" has nowhere to send anyone,
-- and a card that looks clickable and is not is worse than one that never offered.
ALTER TABLE "store_banners" DROP CONSTRAINT "store_banners_one_target";

ALTER TABLE "store_banners" ADD CONSTRAINT "store_banners_one_target" CHECK (
    ("target" = 'CATEGORY' AND "categoryId" IS NOT NULL AND "productId" IS NULL AND "externalUrl" IS NULL)
 OR ("target" = 'PRODUCT'  AND "productId"  IS NOT NULL AND "categoryId" IS NULL AND "externalUrl" IS NULL)
 OR ("target" = 'EXTERNAL' AND "externalUrl" IS NOT NULL AND "categoryId" IS NULL AND "productId" IS NULL)
 OR ("target" = 'NONE'     AND "categoryId" IS NULL AND "productId" IS NULL AND "externalUrl" IS NULL)
);
