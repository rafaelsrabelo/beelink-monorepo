-- bee-link's own coupons (BEELINK-224): a code that gives a page one free month, once in the page's
-- life — never a discount, and nothing made at Asaas. Not the shops' `coupons`, which take money off an
-- order. No row is written here: a coupon is made by the command run in the API's container.
CREATE TABLE "platform_coupons" (
    "id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "maxRedemptions" INTEGER,
    "redemptionCount" INTEGER NOT NULL DEFAULT 0,
    "disabledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "platform_coupons_pkey" PRIMARY KEY ("id")
);

-- One use of a coupon: the page's subscription it was used on, and the free month it gave.
CREATE TABLE "platform_coupon_redemptions" (
    "id" UUID NOT NULL,
    "couponId" UUID NOT NULL,
    "subscriptionId" UUID NOT NULL,
    "freePeriodStartsAt" TIMESTAMP(3) NOT NULL,
    "freePeriodEndsAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_coupon_redemptions_pkey" PRIMARY KEY ("id")
);

-- The code as typed in any case is one code: it is kept in upper case, and only in the shape a shop's
-- coupon has, so the unique index needs no case-insensitive collation.
CREATE UNIQUE INDEX "platform_coupons_code_key" ON "platform_coupons"("code");
ALTER TABLE "platform_coupons" ADD CONSTRAINT "platform_coupons_code_check" CHECK ("code" ~ '^[A-Z0-9][A-Z0-9_-]{2,29}$');

-- The limit, held by the database too: whatever the code does, no coupon is used past it.
ALTER TABLE "platform_coupons" ADD CONSTRAINT "platform_coupons_redemptions_check" CHECK (
    ("maxRedemptions" IS NULL OR "maxRedemptions" > 0)
    AND "redemptionCount" >= 0
    AND ("maxRedemptions" IS NULL OR "redemptionCount" <= "maxRedemptions")
);

-- One coupon a page: the second use of the same page cannot be written.
CREATE UNIQUE INDEX "platform_coupon_redemptions_subscriptionId_key" ON "platform_coupon_redemptions"("subscriptionId");

CREATE INDEX "platform_coupon_redemptions_couponId_createdAt_idx" ON "platform_coupon_redemptions"("couponId", "createdAt" DESC);

ALTER TABLE "platform_coupon_redemptions" ADD CONSTRAINT "platform_coupon_redemptions_period_check" CHECK ("freePeriodEndsAt" > "freePeriodStartsAt");

-- A coupon used is switched off, never deleted; a use goes with its page.
ALTER TABLE "platform_coupon_redemptions" ADD CONSTRAINT "platform_coupon_redemptions_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "platform_coupons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "platform_coupon_redemptions" ADD CONSTRAINT "platform_coupon_redemptions_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "store_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
