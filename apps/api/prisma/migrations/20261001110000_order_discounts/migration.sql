-- BEELINK-191: what an order's discount was made of — the promotions, line by line, and the coupon.

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "couponCode" VARCHAR(30),
ADD COLUMN     "couponDiscountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "couponKind" "CouponKind",
ADD COLUMN     "promotionDiscountCents" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "discountCents" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "promotionId" UUID,
ADD COLUMN     "promotionName" VARCHAR(80);

-- CreateIndex
CREATE INDEX "order_items_promotionId_idx" ON "order_items"("promotionId");

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- The parts are never negative and fit in the whole: what is left of "discountCents" is what the
-- shopkeeper typed.
ALTER TABLE "orders" ADD CONSTRAINT "orders_discount_parts_check" CHECK (
  "promotionDiscountCents" >= 0
  AND "couponDiscountCents" >= 0
  AND "promotionDiscountCents" + "couponDiscountCents" <= "discountCents"
);

-- A coupon is its code and its kind together, and only an order with one has a coupon's discount.
ALTER TABLE "orders" ADD CONSTRAINT "orders_coupon_check" CHECK (
  ("couponCode" IS NULL) = ("couponKind" IS NULL)
  AND ("couponCode" IS NOT NULL OR "couponDiscountCents" = 0)
);

-- A promotion takes at most the line, and a discount names the promotion that took it.
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_discount_check" CHECK (
  "discountCents" >= 0
  AND "discountCents" <= "lineTotalCents"
  AND ("promotionName" IS NOT NULL OR "discountCents" = 0)
);
