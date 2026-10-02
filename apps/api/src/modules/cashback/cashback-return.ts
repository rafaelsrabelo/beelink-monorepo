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

/**
 * The lot after `amountCents` comes back to it, and how much of that is credit again.
 *
 * - **Usable, or expired:** the credit comes back to it, usable, with the validity it had — and at
 *   least seven more days, so credit that expired, or was about to, can still be spent.
 * - **Waiting on its order again, or void:** its order was undone after the customer had spent from it,
 *   and what they spent is kept as what the shop did not get back. What returns now pays that back
 *   first, and only the rest — if any — is credit again. A void lot's order was cancelled: nothing of
 *   it is credit again, or cancelling the use would recreate credit the shop had already forgiven.
 */
export function returnedLotOf(lot: ReturnedLot, amountCents: number, now: Date, dayMs: number): ReturnedLot & { creditedCents: number } {
  if (lot.status === 'AVAILABLE' || lot.status === 'EXPIRED') {
    const floor = new Date(now.getTime() + RETURNED_MIN_DAYS * dayMs);
    const expiresAt = lot.expiresAt === null ? null : lot.expiresAt < floor ? floor : lot.expiresAt;
    return { status: 'AVAILABLE', remainingCents: lot.remainingCents + amountCents, unrecoveredCents: lot.unrecoveredCents, expiresAt, creditedCents: amountCents };
  }

  const recovered = Math.min(lot.unrecoveredCents, amountCents);
  // A pending lot pays out what is recovered when its order is delivered again; a void one never does.
  const pendingBack = lot.status === 'PENDING' ? recovered : 0;
  return {
    status: lot.status,
    remainingCents: lot.remainingCents + pendingBack,
    unrecoveredCents: lot.unrecoveredCents - recovered,
    expiresAt: lot.expiresAt,
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
