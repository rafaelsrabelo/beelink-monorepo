-- A page past due is used for seven days more, and locked once they run out (BEELINK-223). When that
-- grace ends is written as the page is found past due, so the lock, the panel's notice and the
-- e-mails all read one date; null on a page that is not past due or suspended.
ALTER TABLE "store_subscriptions" ADD COLUMN     "graceEndsAt" TIMESTAMP(3);

-- The billing routine's clock moves pages by where they stand: a trial, a paid period or a grace that ended.
CREATE INDEX "store_subscriptions_status_idx" ON "store_subscriptions"("status");
