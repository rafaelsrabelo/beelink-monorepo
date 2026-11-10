-- Kits (plan 2026-11-10--kits-monte-seu-kit): a product whose items the customer picks among one
-- category's products, at the kit's own price, and the products chosen for each kit's order line.
-- AlterTable
ALTER TABLE "products" ADD COLUMN     "kitCategoryId" UUID,
ADD COLUMN     "kitSize" INTEGER;

-- CreateTable
CREATE TABLE "order_item_kit_parts" (
    "id" UUID NOT NULL,
    "orderItemId" UUID NOT NULL,
    "productId" UUID,
    "variantId" UUID,
    "productName" VARCHAR(160) NOT NULL,
    "variantLabel" VARCHAR(320),
    "quantity" INTEGER NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "order_item_kit_parts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_item_kit_parts_orderItemId_position_idx" ON "order_item_kit_parts"("orderItemId", "position");

-- CreateIndex
CREATE INDEX "order_item_kit_parts_variantId_idx" ON "order_item_kit_parts"("variantId");

-- CreateIndex
CREATE INDEX "products_kitCategoryId_idx" ON "products"("kitCategoryId");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_kitCategoryId_fkey" FOREIGN KEY ("kitCategoryId") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_kit_parts" ADD CONSTRAINT "order_item_kit_parts_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_kit_parts" ADD CONSTRAINT "order_item_kit_parts_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_item_kit_parts" ADD CONSTRAINT "order_item_kit_parts_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- What the API validates, held where a write that skipped it would land.
ALTER TABLE "products" ADD CONSTRAINT "products_kit_size_check" CHECK ("kitSize" IS NULL OR "kitSize" BETWEEN 2 AND 99);
ALTER TABLE "order_item_kit_parts" ADD CONSTRAINT "order_item_kit_parts_quantity_check" CHECK ("quantity" >= 1);
