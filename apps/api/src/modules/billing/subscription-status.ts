// Types
import type { SubscriptionStatus } from '@harness-monorepo/contracts';

/**
 * Where a subscription stands at an instant (BEELINK-219).
 *
 * The column holds what was last written; the clock's part is read here. A trial is over the instant
 * it ends, with no routine to run for it — and one that later writes `TRIAL_EXPIRED` says nothing
 * this did not already answer.
 *
 * Only the trial is read. A free period given by a coupon (`freePeriodEndsAt`) and a paid period
 * that ran out change no answer here until the tickets that write them say what they mean.
 */
export function statusAt(row: { status: SubscriptionStatus; trialEndsAt: Date }, now: Date): SubscriptionStatus {
  if (row.status === 'TRIALING' && now.getTime() >= row.trialEndsAt.getTime()) return 'TRIAL_EXPIRED';
  return row.status;
}
