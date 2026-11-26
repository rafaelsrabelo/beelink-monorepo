-- A cashback rate may give back more than was paid, up to 1000.00% (100000 basis points): what credit
-- may pay for stays held by "maxRedeemBps", at most 100%, and never the delivery.
ALTER TABLE "cashback_settings" DROP CONSTRAINT "cashback_settings_rate_check";
ALTER TABLE "cashback_settings" ADD CONSTRAINT "cashback_settings_rate_check" CHECK ("rateBps" BETWEEN 1 AND 100000);

ALTER TABLE "products" DROP CONSTRAINT "products_cashback_rate_check";
ALTER TABLE "products" ADD CONSTRAINT "products_cashback_rate_check" CHECK ("cashbackRateBps" IS NULL OR "cashbackRateBps" BETWEEN 1 AND 100000);

ALTER TABLE "orders" DROP CONSTRAINT "orders_cashback_check";
ALTER TABLE "orders" ADD CONSTRAINT "orders_cashback_check" CHECK (
  "cashbackEarnedCents" >= 0
  AND ("cashbackRateBps" IS NULL OR "cashbackRateBps" BETWEEN 1 AND 100000)
  AND ("cashbackEarnedCents" = 0) = ("cashbackRateBps" IS NULL)
);
