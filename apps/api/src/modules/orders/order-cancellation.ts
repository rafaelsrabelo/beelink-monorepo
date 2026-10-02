// Types
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { revokeOrderCashback } from '../cashback/cashback-orders.js';
import { returnCashback } from '../cashback/cashback-redemption.js';
import { refreshBooks } from '../customers/customer-books.js';
import { releaseCoupon } from '../promotions/order-discounts.js';
import { returnStock } from './order-stock.js';

/**
 * What cancelling an order takes back, whoever cancels it — the shop from the panel or the customer
 * while it is received: the order off the customer's books, the stock placing it took, the use of
 * its coupon, the credit it spent and the cashback it earned. Only what it took: an order from before orders counted stock
 * gives nothing back.
 */
export async function settleCancellation(
  tx: Prisma.TransactionClient,
  order: { id: string; customerId: string; stockTaken: boolean },
): Promise<void> {
  await refreshBooks(tx, order.customerId);
  if (order.stockTaken) await returnStock(tx, order.id);
  await releaseCoupon(tx, order.id);
  const now = new Date();
  // What it spent goes back first (BEELINK-240), then what it earned is taken back.
  await returnCashback(tx, order.id, now);
  await revokeOrderCashback(tx, order.id, 'CANCELLED', now);
}
