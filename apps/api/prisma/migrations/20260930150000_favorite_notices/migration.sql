-- BEELINK-155: a favourite's notice, when its product gets cheaper or comes back in stock.

-- AlterTable: what each favourite saw starts as its like — the price it was liked at, in stock.
ALTER TABLE "customer_favorites" ADD COLUMN     "seenPriceCents" INTEGER,
ADD COLUMN     "seenSoldOut" BOOLEAN NOT NULL DEFAULT false;
UPDATE "customer_favorites" SET "seenPriceCents" = "likedPriceCents";
ALTER TABLE "customer_favorites" ALTER COLUMN "seenPriceCents" SET NOT NULL;

-- CreateTable
CREATE TABLE "favorite_notices" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "previousPriceCents" INTEGER,
    "backInStock" BOOLEAN NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorite_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "favorite_notices_customerId_productId_createdAt_idx" ON "favorite_notices"("customerId", "productId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "favorite_notices_productId_idx" ON "favorite_notices"("productId");

-- CreateIndex
CREATE INDEX "favorite_notices_owed_idx" ON "favorite_notices"("nextAttemptAt") WHERE ("sentAt" IS NULL) AND (attempts < 5);

-- AddForeignKey
ALTER TABLE "favorite_notices" ADD CONSTRAINT "favorite_notices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorite_notices" ADD CONSTRAINT "favorite_notices_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Prices are whole cents and never negative, as the favourite's own are.
ALTER TABLE "customer_favorites" ADD CONSTRAINT "customer_favorites_seen_price_check" CHECK ("seenPriceCents" >= 0);
ALTER TABLE "favorite_notices" ADD CONSTRAINT "favorite_notices_price_check" CHECK ("priceCents" >= 0 AND ("previousPriceCents" IS NULL OR "previousPriceCents" > "priceCents"));
-- A notice says something: it dropped, it came back, or both.
ALTER TABLE "favorite_notices" ADD CONSTRAINT "favorite_notices_says_check" CHECK ("previousPriceCents" IS NOT NULL OR "backInStock");
