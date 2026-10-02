// Types
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { lockLedger, recountCashback } from './cashback-ledger.js';
import { earningBaseOf, earningOf, type EarningParts } from './cashback-earning.js';
import { DAY_MS } from './cashback.constants.js';
import { expiryOf } from './cashback-spending.js';

type Tx = Prisma.TransactionClient;

/**
 * What an order does to its customer's credit (BEELINK-239), inside the transaction that places or
 * moves it. One lot per order, by the unique index on its order: a delivery told twice, or by two
 * people at once, reopens that lot and never makes another — and every step reads the lot again
 * under the locks before it moves it, so the second of two is a step that finds nothing to do.
 */

/**
 * What an order placed now earns, at the shop's rules as they are: the cents, the rate, and the
 * validity its lot will count from the delivery. Null when it earns nothing.
 */
export async function earningForOrder(tx: Tx, storeId: string, parts: EarningParts): Promise<{ earnedCents: number; rateBps: number; validityDays: number | null } | null> {
  const rules = await tx.cashbackSettings.findUnique({ where: { storeId } });
  const earning = earningOf(rules, earningBaseOf(parts));
  return earning && rules ? { ...earning, validityDays: rules.expiresAfterDays } : null;
}

/** Placed: what the order will earn waits, pending, for its delivery — with the validity the shop has now. */
export async function holdOrderCashback(
  tx: Tx,
  order: { storeId: string; customerId: string; orderId: string; earnedCents: number; validityDays: number | null },
): Promise<void> {
  await lockLedger(tx, order.storeId, order.customerId);
  await tx.cashbackCredit.create({
    data: {
      storeId: order.storeId,
      customerId: order.customerId,
      orderId: order.orderId,
      status: 'PENDING',
      amountCents: order.earnedCents,
      remainingCents: order.earnedCents,
      validityDays: order.validityDays,
    },
  });
  await recountCashback(tx, order.customerId);
}

/** The order's lot, read again under its customer's locks; null when the order earns nothing. */
async function lockedLotOf(tx: Tx, orderId: string) {
  const lot = await tx.cashbackCredit.findUnique({ where: { orderId }, select: { storeId: true, customerId: true } });
  if (!lot) return null;
  await lockLedger(tx, lot.storeId, lot.customerId);
  return tx.cashbackCredit.findUnique({ where: { orderId } });
}

/**
 * Delivered: the lot becomes usable, its validity counting from now, and the statement says what it
 * earned. A lot taken back before — the order left *delivered* and came back — pays out what it is
 * worth less what the customer had already spent of it then, which the balance never took back.
 * The cents made usable; null when nothing was.
 */
export async function releaseOrderCashback(tx: Tx, orderId: string, now: Date): Promise<number | null> {
  const lot = await lockedLotOf(tx, orderId);
  if (lot?.status !== 'PENDING') return null;

  const payout = lot.amountCents - lot.unrecoveredCents;
  await tx.cashbackCredit.update({
    where: { id: lot.id },
    data: { status: 'AVAILABLE', remainingCents: payout, availableAt: now, expiresAt: expiryOf(now, lot.validityDays, DAY_MS) },
  });
  if (payout > 0) {
    await tx.cashbackEntry.create({ data: { storeId: lot.storeId, customerId: lot.customerId, kind: 'EARN', amountCents: payout, creditId: lot.id, orderId, createdAt: now } });
  }
  await recountCashback(tx, lot.customerId);
  return payout > 0 ? payout : null;
}

/**
 * The order left *delivered* (`BACK`) or was cancelled (`CANCELLED`): what it earned is taken back.
 * A pending lot simply stops waiting — cancelled, it is void; back, it waits again. A usable one gives
 * back what is left of it, and only that: the balance stops at zero (decided 01/10/2026), and what
 * the customer had spent is kept on the lot as what the shop did not get back. An expired lot has
 * nothing left to give.
 */
export async function revokeOrderCashback(tx: Tx, orderId: string, outcome: 'BACK' | 'CANCELLED', now: Date): Promise<void> {
  const lot = await lockedLotOf(tx, orderId);
  if (!lot || lot.status === 'VOIDED' || lot.status === 'EXPIRED') return;

  if (lot.status === 'PENDING') {
    if (outcome === 'CANCELLED') await tx.cashbackCredit.update({ where: { id: lot.id }, data: { status: 'VOIDED', remainingCents: 0 } });
  } else {
    // What it paid out when it became usable, less what is left: what the customer spent of it.
    const spent = lot.amountCents - lot.unrecoveredCents - lot.remainingCents;
    const unrecoveredCents = lot.unrecoveredCents + spent;
    await tx.cashbackCredit.update({
      where: { id: lot.id },
      data:
        outcome === 'CANCELLED'
          ? { status: 'VOIDED', remainingCents: 0, unrecoveredCents }
          : { status: 'PENDING', remainingCents: lot.amountCents - unrecoveredCents, unrecoveredCents, availableAt: null, expiresAt: null },
    });
    if (lot.remainingCents > 0) {
      await tx.cashbackEntry.create({
        data: { storeId: lot.storeId, customerId: lot.customerId, kind: 'REVERSAL', amountCents: -lot.remainingCents, creditId: lot.id, orderId, createdAt: now },
      });
    }
  }
  await recountCashback(tx, lot.customerId);
}

/**
 * The customer deleted their account: their credit goes with it. What is usable leaves the balance
 * in one line of the statement; what waits on a delivery will never pay out. The record itself may
 * stay, for the shop's books.
 */
export async function forfeitCashback(tx: Tx, storeId: string, customerId: string, now: Date): Promise<void> {
  if (!(await lockLedger(tx, storeId, customerId))) return;
  const { _sum } = await tx.cashbackCredit.aggregate({ where: { customerId, status: 'AVAILABLE' }, _sum: { remainingCents: true } });
  const forfeited = _sum.remainingCents ?? 0;

  await tx.cashbackCredit.updateMany({ where: { customerId, status: { in: ['PENDING', 'AVAILABLE'] } }, data: { status: 'VOIDED', remainingCents: 0 } });
  if (forfeited > 0) await tx.cashbackEntry.create({ data: { storeId, customerId, kind: 'FORFEIT', amountCents: -forfeited, createdAt: now } });
  await recountCashback(tx, customerId);
}
