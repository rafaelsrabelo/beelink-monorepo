-- A visitor's "Avise-me" for a sold-out combination. Nothing reads it yet; it is kept so no request
-- made before the shopkeeper's list exists is lost.

-- CreateTable
CREATE TABLE "restock_requests" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "variantId" UUID NOT NULL,
    "phone" VARCHAR(15) NOT NULL,
    "name" VARCHAR(80),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "restock_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "restock_requests_storeId_createdAt_idx" ON "restock_requests"("storeId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "restock_requests_variantId_phone_key" ON "restock_requests"("variantId", "phone");

-- AddForeignKey
ALTER TABLE "restock_requests" ADD CONSTRAINT "restock_requests_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restock_requests" ADD CONSTRAINT "restock_requests_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "restock_requests" ADD CONSTRAINT "restock_requests_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
