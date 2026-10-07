// Types
import type { Prisma } from '../../../generated/prisma/client.js';

// App
import { purchaseCountsWhen, type PurchaseMoment } from './meta-purchase-event.js';

type Tx = Prisma.TransactionClient;

/** Purchases claimed per sweep, and how long a claimed one is that sweep's: far longer than twenty sends at the client's ten seconds each. */
export const META_PURCHASE_BATCH = 20;
export const META_PURCHASE_LEASE_MS = 10 * 60_000;
/** Between sweeps. */
export const META_PURCHASE_SWEEP_MS = 60_000;
/** The longest a purchase that keeps failing waits between tries. */
export const META_PURCHASE_RETRY_MAX_MS = 6 * 60 * 60_000;
/** How long a purchase of a shop whose token Meta refused waits between looks, without spending a try. */
export const META_PURCHASE_PARKED_MS = 60 * 60_000;
/**
 * How old an event may be when it is sent. Meta refuses one more than seven days old; ten minutes
 * short of that, so a send that leaves on time does not arrive late. Meta counts a purchase told
 * from the browser and from the server once only when the two arrive within 48 hours: lowering
 * this to that is what stops a late server event from being a second purchase.
 */
export const META_EVENT_MAX_AGE_MS = 7 * 24 * 60 * 60_000 - 10 * 60_000;
export const META_PURCHASE_ERROR_MAX_LENGTH = 300;

/** When a purchase that failed its `attempts`-th try is due again: after 1, 2, 4, 8… minutes, six hours at most. */
export function purchaseRetryAtOf(attempts: number, now = Date.now()): Date {
  return new Date(now + Math.min(60_000 * 2 ** (Math.max(attempts, 1) - 1), META_PURCHASE_RETRY_MAX_MS));
}

/** Whether an event that counted at `countedAt` is past what Meta takes. */
export function tooOldToSend(countedAt: Date, now: Date): boolean {
  return now.getTime() - countedAt.getTime() > META_EVENT_MAX_AGE_MS;
}

/**
 * An order just became a purchase: what that owes Meta is written here, in the transaction that
 * made it one, and sent by nobody in it (`MetaPurchases` does, on its own clock).
 *
 * Owed only for an order its customer placed, not cancelled, whose buyer's yes to the shop's pixel
 * was kept with it — no row of `order_marketing_consents`, nothing owed, ever. `moment` is which
 * fact the caller is: a placement owes only an order that counts when placed, a payment only one
 * that counts when paid. The unique order id makes a second hearing owe nothing again. Whether the
 * shop has a token is not asked here: it is read when the purchase is sent.
 */
export async function owePurchase(tx: Tx, orderId: string, moment: PurchaseMoment, countedAt: Date): Promise<boolean> {
  const order = await tx.order.findUnique({
    where: { id: orderId },
    select: {
      storeId: true,
      status: true,
      paymentChannel: true,
      totalCents: true,
      deliveryFeeCents: true,
      marketingConsent: { select: { orderId: true } },
      events: { orderBy: { createdAt: 'asc' }, take: 1, select: { actor: true } },
    },
  });
  if (!order || !order.marketingConsent || order.status === 'CANCELLED') return false;
  if (order.events[0]?.actor !== 'CUSTOMER' || purchaseCountsWhen(order) !== moment) return false;
  const { count } = await tx.orderMetaPurchase.createMany({ data: [{ orderId, storeId: order.storeId, countedAt, nextAttemptAt: new Date() }], skipDuplicates: true });
  return count > 0;
}
