// Types
import type { BillingErrorCode, SubscriptionStatus } from '@harness-monorepo/contracts';

// App
import { brasiliaDayOf, freeMonthEndOf } from './billing-dates.js';
import { PLATFORM_COUPON_CODE } from './billing.constants.js';

/*
  A coupon of bee-link's (BEELINK-224), read: the code as it is kept, why a coupon gives nothing, which
  pages may use one, and the free month it gives. Pure: nothing here reads the database or the clock.
*/

/**
 * A code as it is kept, or null when no coupon could have it — which is "not found" with no read.
 * Checked as typed, before its case is raised: only ASCII passes, so raising it turns no letter into
 * another.
 */
export function storedCouponCodeOf(typed: string): string | null {
  const code = typed.trim();
  return PLATFORM_COUPON_CODE.test(code) ? code.toUpperCase() : null;
}

/** What a coupon's own row says of whether it gives anything. */
export interface CouponHold {
  expiresAt: Date | null;
  maxRedemptions: number | null;
  redemptionCount: number;
  disabledAt: Date | null;
}

export type CouponRefusal = Extract<BillingErrorCode, 'BILLING_COUPON_DISABLED' | 'BILLING_COUPON_EXPIRED' | 'BILLING_COUPON_EXHAUSTED'>;

/**
 * Why a coupon gives nothing at `now`, or null while it gives. Switched off first — bee-link's own
 * word on it — then its last day gone by, then its limit reached. An end is exclusive, as every end of
 * the billing is: at `expiresAt` it is already over.
 */
export function couponRefusalOf(coupon: CouponHold, now: Date): CouponRefusal | null {
  if (coupon.disabledAt) return 'BILLING_COUPON_DISABLED';
  if (coupon.expiresAt && now.getTime() >= coupon.expiresAt.getTime()) return 'BILLING_COUPON_EXPIRED';
  if (coupon.maxRedemptions !== null && coupon.redemptionCount >= coupon.maxRedemptions) return 'BILLING_COUPON_EXHAUSTED';
  return null;
}

export type CouponPageRefusal = Extract<BillingErrorCode, 'BILLING_PAGE_EXEMPT' | 'BILLING_PAGE_ACTIVE' | 'BILLING_COUPON_PAGE_PAID'>;

/**
 * Why a page standing at `status` — as it reads now (`statusAt`) — may not use a coupon, or null when
 * it may. A coupon is for a page that never paid, in its trial or past it, locked or not: the end of
 * its free month is the rule of a page that never paid. One that paid has a subscription at Asaas that
 * goes on charging — a card by itself — so its month would not be free, and a coupon is no way out of a
 * renewal due.
 */
export function couponPageRefusalOf(status: SubscriptionStatus): CouponPageRefusal | null {
  switch (status) {
    case 'TRIALING':
    case 'TRIAL_EXPIRED':
      return null;
    case 'EXEMPT':
      return 'BILLING_PAGE_EXEMPT';
    case 'ACTIVE':
      return 'BILLING_PAGE_ACTIVE';
    case 'PAST_DUE':
    case 'SUSPENDED':
    case 'CANCELED':
      return 'BILLING_COUPON_PAGE_PAID';
  }
}

/** A free month, as instants: the first one free and the first one past it. */
export interface FreeMonth {
  startsAt: Date;
  endsAt: Date;
}

/**
 * The month a coupon used at `now` gives a page. It begins at the latest of now, the trial's end and
 * the end of a free period still running — a page never gives up a free day for it — and ends where a
 * month begun on that day of Brasília's calendar does (`freeMonthEndOf`). The trial's end and a free
 * period's are midnights in Brasília, so a month after either begins with the day they close on.
 */
export function freeMonthOf(row: { trialEndsAt: Date; freePeriodEndsAt: Date | null }, now: Date): FreeMonth {
  let startsAt = now;
  for (const end of [row.trialEndsAt, row.freePeriodEndsAt]) {
    if (end && end.getTime() > startsAt.getTime()) startsAt = end;
  }
  return { startsAt, endsAt: freeMonthEndOf(brasiliaDayOf(startsAt)) };
}
