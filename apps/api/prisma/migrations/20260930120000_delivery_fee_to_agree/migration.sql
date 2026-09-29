-- A delivery's fee not agreed yet is null — "a combinar" — and no longer zero, which reads as a free
-- delivery (BEELINK-170).
ALTER TABLE "orders" ALTER COLUMN "deliveryFeeCents" DROP NOT NULL;

-- The cart's deliveries placed before: a zero there was never agreed, it was all the cart could write.
-- An order the shopkeeper registered keeps its zero — it was typed. The cart's order starts RECEIVED,
-- set by its customer; the shopkeeper's starts ACCEPTED, set by them.
UPDATE "orders" o SET "deliveryFeeCents" = NULL
WHERE o."fulfillment" = 'DELIVERY'
  AND o."deliveryFeeCents" = 0
  AND EXISTS (
    SELECT 1 FROM "order_events" e
    WHERE e."orderId" = o."id" AND e."status" = 'RECEIVED' AND e."actor" = 'CUSTOMER'
  );

-- Only a delivery waits for a fee: a pick-up has none to agree.
ALTER TABLE "orders" ADD CONSTRAINT "orders_delivery_fee_to_agree_check"
  CHECK ("deliveryFeeCents" IS NOT NULL OR "fulfillment" = 'DELIVERY');
