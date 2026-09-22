-- `isAvailable` becomes a status, and a product gains an origin.
--
-- Written by hand rather than generated, because the generated version dropped the boolean and
-- created the enum beside it: every product already taken off sale would have come back on sale,
-- silently, in the same statement that claimed to preserve the shop's catalogue.

CREATE TYPE "ProductStatus" AS ENUM ('ACTIVE', 'DRAFT');
CREATE TYPE "ProductOrigin" AS ENUM ('IN_HOUSE', 'RESALE');

ALTER TABLE "products" ADD COLUMN "status" "ProductStatus" NOT NULL DEFAULT 'ACTIVE';
ALTER TABLE "products" ADD COLUMN "origin" "ProductOrigin";

-- The carry-over. A product that was off sale was never published as far as the shopkeeper is
-- concerned, so it lands as a draft; everything else stays on sale.
UPDATE "products" SET "status" = CASE WHEN "isAvailable" THEN 'ACTIVE'::"ProductStatus" ELSE 'DRAFT'::"ProductStatus" END;

-- `origin` is left null on purpose: nobody has answered the question yet, and a default would
-- print an answer onto every row written before the column existed.

DROP INDEX "products_storeId_isAvailable_position_idx";
DROP INDEX "products_categoryId_isAvailable_position_idx";

ALTER TABLE "products" DROP COLUMN "isAvailable";

CREATE INDEX "products_storeId_status_position_idx" ON "products"("storeId", "status", "position");
CREATE INDEX "products_categoryId_status_position_idx" ON "products"("categoryId", "status", "position");
