// Types
import type { SubscriptionStatus } from '@harness-monorepo/contracts';

/**
 * Where a subscription stands at an instant (BEELINK-219).
 *
 * The column holds what was last written; the clock's part is read here. A trial is over the instant
 * it ends, with no routine to run for it — and one that later writes `TRIAL_EXPIRED` says nothing
 * this did not already answer. A paid period is the same (BEELINK-221): an `ACTIVE` page is past due
 * the instant `currentPeriodEndsAt` comes with nothing written since, as the next read of Asaas would
 * write it — unless that read finds the renewal paid.
 *
 * A free period given by a coupon (`freePeriodEndsAt`) changes no answer here until the ticket that
 * writes it says what it means.
 */
export function statusAt(row: { status: SubscriptionStatus; trialEndsAt: Date; currentPeriodEndsAt?: Date | null }, now: Date): SubscriptionStatus {
  if (row.status === 'TRIALING' && now.getTime() >= row.trialEndsAt.getTime()) return 'TRIAL_EXPIRED';
  if (row.status === 'ACTIVE' && row.currentPeriodEndsAt && now.getTime() >= row.currentPeriodEndsAt.getTime()) return 'PAST_DUE';
  return row.status;
}
