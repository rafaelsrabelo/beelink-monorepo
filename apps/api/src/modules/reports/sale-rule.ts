// App
import { Prisma } from '../../generated/prisma/client.js';

/**
 * Which orders are sales, as a condition on `orders o` (BEELINK-275) — the one place a report reads
 * the rule from, so two reports of the same shop never disagree.
 *
 * An order not cancelled: what the customer's books already count. One charged online, with
 * something to pay, only while a charge of its own holds the customer's money — confirmed, received
 * or refunded in part: a Pix never paid is cancelled by itself in three days and was never a sale,
 * and one refunded whole holds nothing. It is the rule a purchase is told to Meta by
 * (`purchaseCountsWhen`), which is what lets the panel and Meta be read side by side. An order
 * charged online with nothing to pay — a coupon or credit covered a closed total — has no charge to
 * wait for and counts like one settled between shop and customer.
 *
 * A partial refund does not lower what the order counts for: it counts whole.
 */
export const SALE_CONDITION = Prisma.sql`
  o."status" <> 'CANCELLED'
  AND (
    o."paymentChannel" = 'OFFLINE'
    OR (o."totalCents" = 0 AND o."deliveryFeeCents" IS NOT NULL)
    OR EXISTS (
      SELECT 1 FROM "order_payments" p
      WHERE p."orderId" = o."id" AND p."status" IN ('CONFIRMED', 'RECEIVED', 'PARTIALLY_REFUNDED')
    )
  )`;
