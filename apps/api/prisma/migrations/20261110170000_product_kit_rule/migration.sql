-- A kit's rule (plan 2026-11-10--kits-monte-seu-kit, revised): every product of the shop, only those of
-- some categories, or every one but those of some categories — in place of its one category. A kit
-- made before keeps what it let in: "only" its category.

-- CreateEnum
CREATE TYPE "KitScope" AS ENUM ('ALL', 'ONLY', 'EXCEPT');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "kitScope" "KitScope";

-- CreateTable
CREATE TABLE "product_kit_categories" (
    "productId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,

    CONSTRAINT "product_kit_categories_pkey" PRIMARY KEY ("productId","categoryId")
);

-- CreateIndex
CREATE INDEX "product_kit_categories_categoryId_idx" ON "product_kit_categories"("categoryId");

-- AddForeignKey
ALTER TABLE "product_kit_categories" ADD CONSTRAINT "product_kit_categories_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_kit_categories" ADD CONSTRAINT "product_kit_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every kit there is lets in what it did: its category, now named on its rule. One whose category was
-- deleted lets nothing in, as before, until another is named.
UPDATE "products" SET "kitScope" = 'ONLY' WHERE "kitSize" IS NOT NULL;
INSERT INTO "product_kit_categories" ("productId", "categoryId")
SELECT "id", "kitCategoryId" FROM "products" WHERE "kitSize" IS NOT NULL AND "kitCategoryId" IS NOT NULL;

-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_kitCategoryId_fkey";

-- DropIndex
DROP INDEX "products_kitCategoryId_idx";

-- AlterTable
ALTER TABLE "products" DROP COLUMN "kitCategoryId";

-- A size with no rule, or a rule with no size, is no kit and not a product either.
ALTER TABLE "products" ADD CONSTRAINT "products_kit_scope_check" CHECK (("kitSize" IS NULL) = ("kitScope" IS NULL));
