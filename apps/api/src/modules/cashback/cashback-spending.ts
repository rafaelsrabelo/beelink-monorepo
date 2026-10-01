/**
 * The order credit is spent in, and how a sum is taken from it (BEELINK-238). Pure, so the rule is
 * tested on its own: what a negative adjustment takes now, and what an order spends in U3.
 */

export interface SpendableLot {
  id: string;
  remainingCents: number;
  /** Null never expires. */
  expiresAt: Date | null;
  createdAt: Date;
}

/**
 * The soonest to expire first, so the customer loses as little as possible to an expiry; the lots
 * that never expire last; on a tie, the oldest first, and then by id, so two reads agree.
 */
export function spendingOrder<T extends SpendableLot>(lots: readonly T[]): T[] {
  return [...lots].sort(
    (a, b) =>
      (a.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY) - (b.expiresAt?.getTime() ?? Number.POSITIVE_INFINITY) ||
      a.createdAt.getTime() - b.createdAt.getTime() ||
      a.id.localeCompare(b.id),
  );
}

/**
 * What `amountCents` takes from each lot, in spending order, leaving out the lots it does not reach.
 * Null when the lots together hold less: a sum is taken whole or not at all, and the balance never
 * goes below zero.
 */
export function takeFrom(lots: readonly SpendableLot[], amountCents: number): { id: string; takeCents: number }[] | null {
  const taken: { id: string; takeCents: number }[] = [];
  let left = amountCents;

  for (const lot of spendingOrder(lots)) {
    if (left <= 0) break;
    if (lot.remainingCents <= 0) continue;
    const takeCents = Math.min(lot.remainingCents, left);
    taken.push({ id: lot.id, takeCents });
    left -= takeCents;
  }

  return left > 0 ? null : taken;
}

/** When a lot made usable at `from` expires, by a validity in days; null with no validity. */
export function expiryOf(from: Date, expiresAfterDays: number | null, dayMs: number): Date | null {
  return expiresAfterDays === null ? null : new Date(from.getTime() + expiresAfterDays * dayMs);
}
