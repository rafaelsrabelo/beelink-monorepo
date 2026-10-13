-- One request at a time talks to Asaas about a page's subscription (BEELINK-292): the claim is written
-- on the page's row and committed before Asaas is asked, as `billing_accounts` does for the customer.
ALTER TABLE "store_subscriptions" ADD COLUMN "asaasSubscriptionClaimedUntil" TIMESTAMP(3);
