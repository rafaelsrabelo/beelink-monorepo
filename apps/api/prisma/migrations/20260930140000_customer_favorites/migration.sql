-- BEELINK-153: a shopper's favourites at a shop, with the price they liked at.

-- CreateTable
CREATE TABLE "customer_favorites" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID,
    "likedPriceCents" INTEGER NOT NULL,
    "likedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_favorites_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_favorites_customerId_likedAt_idx" ON "customer_favorites"("customerId", "likedAt" DESC);

-- CreateIndex
CREATE INDEX "customer_favorites_productId_idx" ON "customer_favorites"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "customer_favorites_customerId_productId_key" ON "customer_favorites"("customerId", "productId");

-- AddForeignKey
ALTER TABLE "customer_favorites" ADD CONSTRAINT "customer_favorites_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_favorites" ADD CONSTRAINT "customer_favorites_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customer_favorites" ADD CONSTRAINT "customer_favorites_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- A price is whole cents and never negative, as on the rows it is copied from.
ALTER TABLE "customer_favorites" ADD CONSTRAINT "customer_favorites_liked_price_check" CHECK ("likedPriceCents" >= 0);
