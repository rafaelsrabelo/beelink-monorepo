// Types
import type { SubscriptionStatus } from '@harness-monorepo/contracts';

// App
import { brasiliaDayOf, closeOfBrasiliaDay } from './billing-dates.js';
import { GRACE_DAYS } from './billing.constants.js';

const GRACE_MS = GRACE_DAYS * 86_400_000;

/** What a page's standing is read from: the row as written, the instants that end its parts. */
export interface StandingRow {
  status: SubscriptionStatus;
  trialEndsAt: Date;
  currentPeriodEndsAt?: Date | null;
  graceEndsAt?: Date | null;
}

/**
 * The first instant a page past due is locked (BEELINK-223): `GRACE_DAYS` after its paid period
 * ended, or — with no period to count from, its only payment contested — after the day it was found
 * past due, which is now for a page nobody found so yet. A grace written is never moved earlier: a
 * later count that ends sooner keeps the one written, and the notice already given holds.
 */
export function graceEndOf(row: Pick<StandingRow, 'currentPeriodEndsAt' | 'graceEndsAt'>, now: Date): Date {
  const counted = row.currentPeriodEndsAt ? new Date(row.currentPeriodEndsAt.getTime() + GRACE_MS) : null;
  const written = row.graceEndsAt ?? null;
  if (written && counted) return written > counted ? written : counted;
  return written ?? counted ?? new Date(closeOfBrasiliaDay(brasiliaDayOf(now)).getTime() + GRACE_MS);
}

/** Whether the page paid before and its period ended unpaid: written so, or `ACTIVE` with its period gone by. */
export function isPastDue(row: StandingRow, now: Date): boolean {
  if (row.status === 'PAST_DUE') return true;
  return row.status === 'ACTIVE' && !!row.currentPeriodEndsAt && now.getTime() >= row.currentPeriodEndsAt.getTime();
}

/**
 * Where a subscription stands at an instant (BEELINK-219).
 *
 * The column holds what was last written; the clock's part is read here. A trial is over the instant
 * it ends, with no routine to run for it — and one that later writes `TRIAL_EXPIRED` says nothing
 * this did not already answer. A paid period is the same (BEELINK-221): an `ACTIVE` page is past due
 * the instant `currentPeriodEndsAt` comes with nothing written since, as the next read of Asaas would
 * write it — unless that read finds the renewal paid. And a page past due is suspended the instant
 * its grace ends (BEELINK-223), as the billing routine's clock would write it.
 *
 * A free period given by a coupon (`freePeriodEndsAt`) moves no standing: it keeps a page open
 * whatever it stands at, which is the lock's to say (`page-lock.ts`).
 */
export function statusAt(row: StandingRow, now: Date): SubscriptionStatus {
  if (row.status === 'TRIALING' && now.getTime() >= row.trialEndsAt.getTime()) return 'TRIAL_EXPIRED';
  if (isPastDue(row, now)) return now.getTime() >= graceEndOf({ currentPeriodEndsAt: row.currentPeriodEndsAt ?? null, graceEndsAt: row.graceEndsAt ?? null }, now).getTime() ? 'SUSPENDED' : 'PAST_DUE';
  return row.status;
}
