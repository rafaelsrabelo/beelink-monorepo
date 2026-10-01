-- BEELINK-156: reviews by the customers a product was delivered to, and the product's rating cache.

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "reviewCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "reviewRatingSum" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "product_reviews" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "variantId" UUID,
    "variantLabel" VARCHAR(320),
    "orderId" UUID,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(1000),
    "hiddenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "product_reviews_productId_hiddenAt_createdAt_idx" ON "product_reviews"("productId", "hiddenAt", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "product_reviews_storeId_createdAt_idx" ON "product_reviews"("storeId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "product_reviews_variantId_idx" ON "product_reviews"("variantId");

-- CreateIndex
CREATE INDEX "product_reviews_orderId_idx" ON "product_reviews"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "product_reviews_customerId_productId_key" ON "product_reviews"("customerId", "productId");

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- A rating is 1 to 5, and the cache never goes below nothing.
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_rating_check" CHECK ("rating" BETWEEN 1 AND 5);
ALTER TABLE "products" ADD CONSTRAINT "products_review_cache_check" CHECK ("reviewCount" >= 0 AND "reviewRatingSum" >= "reviewCount" AND "reviewRatingSum" <= 5 * "reviewCount");
