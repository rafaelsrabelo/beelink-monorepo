// Types
import type { CashbackCreditStatus } from '@harness-monorepo/contracts';

/**
 * Giving a lot back what a cancelled order spent of it (BEELINK-240). Pure, so each case is tested on
 * its own.
 */

/** Seven days: what credit given back is at least worth, so the customer can still spend it (decided 01/10/2026). */
export const RETURNED_MIN_DAYS = 7;

export interface ReturnedLot {
  status: CashbackCreditStatus;
  remainingCents: number;
  unrecoveredCents: number;
  /** Null never expires. */
  expiresAt: Date | null;
}

/** What a cancellation gives back of one use: the lot after it, and how much of it is credit again. */
export interface ReturnedCredit {
  lot: ReturnedLot;
  /**
   * What returns as a lot of its own: credit given back has at least seven days, and the lot still
   * holds credit of its own that expires sooner — or already has — which keeps its day. Null when
   * what returns goes back into the lot.
   */
  split: { amountCents: number; expiresAt: Date } | null;
  creditedCents: number;
}

/**
 * The lot after `amountCents` comes back to it, and how much of that is credit again.
 *
 * - **Usable, or expired:** the credit comes back usable, with the lot's validity — and at least seven
 *   more days, so credit that expired, or was about to, can still be spent. Only what returns gets
 *   those days: what is left of the lot keeps its own, or a self-cancelled order of one cent would
 *   carry a whole lot past its expiry, week after week, and expired credit would come back to life.
 *   So it goes back into the lot when the lot's validity already reaches past the week, or when
 *   nothing else is in it; otherwise it is a lot of its own.
 * - **Waiting on its order again, or void:** its order was undone after the customer had spent from it,
 *   and what they spent is kept as what the shop did not get back. What returns now pays that back
 *   first, and only the rest — if any — is credit again. A void lot's order was cancelled: nothing of
 *   it is credit again, or cancelling the use would recreate credit the shop had already forgiven.
 */
export function returnedLotOf(lot: ReturnedLot, amountCents: number, now: Date, dayMs: number): ReturnedCredit {
  if (lot.status === 'AVAILABLE' || lot.status === 'EXPIRED') {
    const floor = new Date(now.getTime() + RETURNED_MIN_DAYS * dayMs);
    if (lot.expiresAt === null || lot.expiresAt >= floor) {
      return { lot: { ...lot, status: 'AVAILABLE', remainingCents: lot.remainingCents + amountCents }, split: null, creditedCents: amountCents };
    }
    if (lot.remainingCents === 0) {
      return { lot: { ...lot, status: 'AVAILABLE', remainingCents: amountCents, expiresAt: floor }, split: null, creditedCents: amountCents };
    }
    return { lot, split: { amountCents, expiresAt: floor }, creditedCents: amountCents };
  }

  const recovered = Math.min(lot.unrecoveredCents, amountCents);
  // A pending lot pays out what is recovered when its order is delivered again; a void one never does.
  const pendingBack = lot.status === 'PENDING' ? recovered : 0;
  return {
    lot: { ...lot, remainingCents: lot.remainingCents + pendingBack, unrecoveredCents: lot.unrecoveredCents - recovered },
    split: null,
    creditedCents: 0,
  };
}

/**
 * The most of a customer's credit a cart can take: the shop's share of the products after their
 * discounts, never the delivery — and never more than they have.
 */
export function cashbackMaxOf(balanceCents: number, productsCents: number, maxRedeemBps: number): number {
  return Math.max(0, Math.min(balanceCents, Math.floor((productsCents * maxRedeemBps) / 10_000)));
}
