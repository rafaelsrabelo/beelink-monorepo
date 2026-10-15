// Types
import type { PageLockReason } from '@harness-monorepo/contracts';

// App
import { LOCKED_ANSWER_MS } from './billing.constants.js';
import { graceEndOf, isPastDue, statusAt, type StandingRow } from './subscription-status.js';

/*
  Whether a page is locked for want of payment (BEELINK-223), and why: the one rule, asked by the
  guard on every route of a page, by the read of its subscription, by its shop window and by the
  billing routine's clock. Pure: nothing here reads the database or the configuration, and whether
  this deployment locks at all is the caller's to know (`PageLocks.engaged`).

  Every end is an instant, and exclusive: at `trialEndsAt`, `currentPeriodEndsAt`, `freePeriodEndsAt`
  and the grace's end the thing is already over.
*/

/** What the lock is read from: a page's subscription row. */
export interface LockRow extends StandingRow {
  currentPeriodEndsAt: Date | null;
  freePeriodEndsAt: Date | null;
  graceEndsAt: Date | null;
}

/** The columns `LockRow` is read from, for a query's `select`. */
export const LOCK_COLUMNS = { status: true, trialEndsAt: true, currentPeriodEndsAt: true, freePeriodEndsAt: true, graceEndsAt: true } as const;

/**
 * Why the page is locked at `now`, or null while it is open.
 *
 * - Exempt: never.
 * - Inside a free period a coupon gave: never, whatever it stands at. After it, the rule as ever —
 *   which, for a page that never paid, is the lock.
 * - Never paid: open through its trial, locked from the instant it ends (`TRIAL_EXPIRED`).
 * - Past due: open through its grace, then suspended and locked (`SUSPENDED`) until it pays.
 * - Cancelled: open while the period it paid for runs, locked after it, or at once with none.
 */
export function lockOf(row: LockRow, now: Date): PageLockReason | null {
  if (row.status === 'EXEMPT') return null;
  if (row.freePeriodEndsAt && now.getTime() < row.freePeriodEndsAt.getTime()) return null;

  const status = statusAt(row, now);
  if (status === 'TRIAL_EXPIRED' || status === 'SUSPENDED') return status;
  if (status === 'CANCELED' && !(row.currentPeriodEndsAt && now.getTime() < row.currentPeriodEndsAt.getTime())) return 'CANCELED';
  return null;
}

/**
 * The instant past which what `lockOf` answers now may no longer hold by the clock alone, or null
 * when no clock can change it (an exempt page).
 *
 * For an open page, the earliest end still ahead — a trial, a paid period, a free period, a grace —
 * among which is the one its lock would close at: one that changes nothing only costs a fresh read.
 * For a locked page, `LOCKED_ANSWER_MS` from now: it opens by a payment, which no clock knows.
 */
export function lockChangesAt(row: LockRow, now: Date): Date | null {
  if (row.status === 'EXEMPT') return null;
  if (lockOf(row, now)) return new Date(now.getTime() + LOCKED_ANSWER_MS);

  const ends = [row.trialEndsAt, row.currentPeriodEndsAt, row.freePeriodEndsAt, isPastDue(row, now) ? graceEndOf(row, now) : null];
  let next: Date | null = null;
  for (const end of ends) if (end && end.getTime() > now.getTime() && (!next || end.getTime() < next.getTime())) next = end;
  return next;
}

/** More than the ends a row can have — a trial, a paid period, a free one, a grace — each passed once at most. */
const LOCK_WALK_MAX = 8;

/**
 * The first instant from `from` on at which the page is locked if only the clock moves — nothing paid,
 * no coupon used, no exemption — or null when no clock ever locks it (an exempt page). Asks `lockOf` at
 * `from` and then at each instant `lockChangesAt` names, so it says nothing the lock itself would not
 * (BEELINK-297: the day each page locks, told before charging is switched on).
 */
export function lockStartOf(row: LockRow, from: Date): Date | null {
  let at = from;
  for (let step = 0; step < LOCK_WALK_MAX; step += 1) {
    if (lockOf(row, at)) return at;
    const next = lockChangesAt(row, at);
    if (!next || next.getTime() <= at.getTime()) return null;
    at = next;
  }
  return null;
}
