-- BEELINK-190: a shop's promotions and coupons, and the uses a coupon had.

-- CreateEnum
CREATE TYPE "DiscountKind" AS ENUM ('PERCENT', 'FIXED');

-- CreateEnum
CREATE TYPE "PromotionScope" AS ENUM ('CART', 'PRODUCTS', 'CATEGORIES');

-- CreateEnum
CREATE TYPE "CouponKind" AS ENUM ('PERCENT', 'FIXED', 'FREE_SHIPPING');

-- CreateTable
CREATE TABLE "promotions" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "scope" "PromotionScope" NOT NULL,
    "discountKind" "DiscountKind" NOT NULL,
    "percentBps" INTEGER,
    "amountCents" INTEGER,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_products" (
    "promotionId" UUID NOT NULL,
    "productId" UUID NOT NULL,

    CONSTRAINT "promotion_products_pkey" PRIMARY KEY ("promotionId","productId")
);

-- CreateTable
CREATE TABLE "promotion_categories" (
    "promotionId" UUID NOT NULL,
    "categoryId" UUID NOT NULL,

    CONSTRAINT "promotion_categories_pkey" PRIMARY KEY ("promotionId","categoryId")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "kind" "CouponKind" NOT NULL,
    "percentBps" INTEGER,
    "amountCents" INTEGER,
    "minSubtotalCents" INTEGER NOT NULL DEFAULT 0,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "maxUses" INTEGER,
    "maxUsesPerCustomer" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupon_redemptions" (
    "id" UUID NOT NULL,
    "couponId" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "discountCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "promotions_storeId_createdAt_idx" ON "promotions"("storeId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "promotion_products_productId_idx" ON "promotion_products"("productId");

-- CreateIndex
CREATE INDEX "promotion_categories_categoryId_idx" ON "promotion_categories"("categoryId");

-- CreateIndex
CREATE INDEX "coupons_storeId_createdAt_idx" ON "coupons"("storeId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "coupons_storeId_code_key" ON "coupons"("storeId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "coupon_redemptions_orderId_key" ON "coupon_redemptions"("orderId");

-- CreateIndex
CREATE INDEX "coupon_redemptions_couponId_createdAt_idx" ON "coupon_redemptions"("couponId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_products" ADD CONSTRAINT "promotion_products_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_products" ADD CONSTRAINT "promotion_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_categories" ADD CONSTRAINT "promotion_categories_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_categories" ADD CONSTRAINT "promotion_categories_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "product_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- A discount states its kind, and the kind decides which of the two numbers it carries. Each value
-- is asked for by name: a NULL compared to anything is NULL, and a CHECK lets NULL through.
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_discount_check" CHECK (
  ("discountKind" = 'PERCENT' AND "percentBps" IS NOT NULL AND "percentBps" BETWEEN 1 AND 10000 AND "amountCents" IS NULL)
  OR ("discountKind" = 'FIXED' AND "amountCents" IS NOT NULL AND "amountCents" >= 1 AND "percentBps" IS NULL)
);
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_discount_check" CHECK (
  ("kind" = 'PERCENT' AND "percentBps" IS NOT NULL AND "percentBps" BETWEEN 1 AND 10000 AND "amountCents" IS NULL)
  OR ("kind" = 'FIXED' AND "amountCents" IS NOT NULL AND "amountCents" >= 1 AND "percentBps" IS NULL)
  OR ("kind" = 'FREE_SHIPPING' AND "percentBps" IS NULL AND "amountCents" IS NULL)
);

-- A period ends after it starts, or never.
ALTER TABLE "promotions" ADD CONSTRAINT "promotions_period_check" CHECK ("endsAt" IS NULL OR "endsAt" > "startsAt");
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_period_check" CHECK ("endsAt" IS NULL OR "endsAt" > "startsAt");

-- The code as it is stored: upper case, so the unique index reads "whatever the case" for any writer.
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_code_check" CHECK ("code" ~ '^[A-Z0-9][A-Z0-9_-]{2,29}$');

-- A limit is at least one use, and nothing here goes below zero.
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_limits_check" CHECK (
  "minSubtotalCents" >= 0
  AND ("maxUses" IS NULL OR "maxUses" >= 1)
  AND ("maxUsesPerCustomer" IS NULL OR "maxUsesPerCustomer" >= 1)
  AND "usedCount" >= 0
);
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_discount_check" CHECK ("discountCents" >= 0);
