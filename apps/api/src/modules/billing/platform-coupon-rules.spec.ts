// Types
import type { SubscriptionStatus } from '@harness-monorepo/contracts';

// App
import { lastDayBefore } from './billing-dates.js';
import { couponPageRefusalOf, couponRefusalOf, freeMonthOf, storedCouponCodeOf, type CouponHold } from './platform-coupon-rules.js';

const DAY = 86_400_000;

/** An instant said as Brasília's clock reads it. */
const brt = (local: string): Date => new Date(`${local}-03:00`);

describe("a coupon's code, as it is kept (BEELINK-224)", () => {
  it('is the code typed, trimmed and in upper case', () => {
    expect(storedCouponCodeOf('  teste-mes_um ')).toBe('TESTE-MES_UM');
    expect(storedCouponCodeOf('TESTE1')).toBe('TESTE1');
    expect(storedCouponCodeOf('abc')).toBe('ABC');
    expect(storedCouponCodeOf('a'.repeat(30))).toBe('A'.repeat(30));
  });

  it.each([
    ['nothing', ''],
    ['spaces', '   '],
    ['two characters', 'ab'],
    ['thirty-one characters', 'a'.repeat(31)],
    ['a space inside', 'teste mes'],
    ['a hyphen first', '-teste'],
    ['an underscore first', '_teste'],
    ['an accent', 'TÉSTE'],
    ['a letter that changes as its case is raised', 'teßte'],
    ['a dot', 'teste.mes'],
  ])('is no code at all with %s: not found, with nothing read', (_what, typed) => {
    expect(storedCouponCodeOf(typed)).toBeNull();
  });
});

describe('whether a coupon gives anything', () => {
  const now = new Date('2026-10-20T15:00:00.000Z');
  const holds: CouponHold = { expiresAt: null, maxRedemptions: null, redemptionCount: 0, disabledAt: null };

  it('gives while it is on, in date and under its limit', () => {
    expect(couponRefusalOf(holds, now)).toBeNull();
    expect(couponRefusalOf({ ...holds, expiresAt: new Date(now.getTime() + 1), maxRedemptions: 3, redemptionCount: 2 }, now)).toBeNull();
  });

  it('gives nothing once switched off, whatever else it says', () => {
    expect(couponRefusalOf({ ...holds, disabledAt: new Date('2026-10-19T12:00:00.000Z') }, now)).toBe('BILLING_COUPON_DISABLED');
    expect(couponRefusalOf({ expiresAt: new Date(0), maxRedemptions: 1, redemptionCount: 1, disabledAt: new Date(0) }, now)).toBe('BILLING_COUPON_DISABLED');
  });

  it('gives nothing from the instant its last day is over', () => {
    expect(couponRefusalOf({ ...holds, expiresAt: now }, now)).toBe('BILLING_COUPON_EXPIRED');
    expect(couponRefusalOf({ ...holds, expiresAt: new Date(now.getTime() + 1) }, now)).toBeNull();
    // Out of date and used up both: its date is what it says first.
    expect(couponRefusalOf({ ...holds, expiresAt: now, maxRedemptions: 1, redemptionCount: 1 }, now)).toBe('BILLING_COUPON_EXPIRED');
  });

  it('gives nothing once as many pages used it as it allows', () => {
    expect(couponRefusalOf({ ...holds, maxRedemptions: 2, redemptionCount: 2 }, now)).toBe('BILLING_COUPON_EXHAUSTED');
    expect(couponRefusalOf({ ...holds, maxRedemptions: 2, redemptionCount: 1 }, now)).toBeNull();
    expect(couponRefusalOf({ ...holds, maxRedemptions: null, redemptionCount: 1_000_000 }, now)).toBeNull();
  });
});

describe('which page may use a coupon', () => {
  it.each<[SubscriptionStatus, string | null]>([
    ['TRIALING', null],
    ['TRIAL_EXPIRED', null],
    ['EXEMPT', 'BILLING_PAGE_EXEMPT'],
    ['ACTIVE', 'BILLING_PAGE_ACTIVE'],
    ['PAST_DUE', 'BILLING_COUPON_PAGE_PAID'],
    ['SUSPENDED', 'BILLING_COUPON_PAGE_PAID'],
    ['CANCELED', 'BILLING_COUPON_PAGE_PAID'],
  ])('a page that reads %s: %s', (status, refusal) => {
    expect(couponPageRefusalOf(status)).toBe(refusal);
  });
});

describe('the month a coupon gives', () => {
  /** A page created on 13/10/2026: its trial covers through 20/10 and is over at the midnight that closes it. */
  const trialEndsAt = new Date('2026-10-21T03:00:00.000Z');

  it('begins when the trial ends, for a page still in it: no day of the trial is given up', () => {
    const month = freeMonthOf({ trialEndsAt, freePeriodEndsAt: null }, brt('2026-10-15T14:00:00'));

    expect(month.startsAt).toEqual(trialEndsAt);
    // The trial's last day is 20/10, the first free day 21/10, the last 21/11.
    expect(month.endsAt.toISOString()).toBe('2026-11-22T03:00:00.000Z');
    expect(lastDayBefore(month.endsAt)).toBe('2026-11-21');
  });

  it('begins now for a page whose trial is over, and covers today and the same day a month later', () => {
    const now = brt('2026-10-25T14:00:00');
    const month = freeMonthOf({ trialEndsAt, freePeriodEndsAt: null }, now);

    expect(month.startsAt).toEqual(now);
    expect(lastDayBefore(month.endsAt)).toBe('2026-11-25');
  });

  it("counts by Brasília's day: at 23:30 there it is still the 31st, whatever UTC says", () => {
    const month = freeMonthOf({ trialEndsAt, freePeriodEndsAt: null }, brt('2026-10-31T23:30:00'));

    expect(lastDayBefore(month.endsAt)).toBe('2026-11-30');
  });

  it('begins when a free period still running ends, so a coupon adds a month after it and not over it', () => {
    const running = new Date('2026-11-14T03:00:00.000Z');
    const month = freeMonthOf({ trialEndsAt, freePeriodEndsAt: running }, brt('2026-11-01T10:00:00'));

    expect(month.startsAt).toEqual(running);
    expect(lastDayBefore(month.endsAt)).toBe('2026-12-14');
  });

  it('begins now when the free period is already over', () => {
    const now = brt('2026-11-20T10:00:00');
    const month = freeMonthOf({ trialEndsAt, freePeriodEndsAt: new Date('2026-11-14T03:00:00.000Z') }, now);

    expect(month.startsAt).toEqual(now);
    expect(lastDayBefore(month.endsAt)).toBe('2026-12-20');
  });

  it('begins now at the very instant the trial ends', () => {
    expect(freeMonthOf({ trialEndsAt, freePeriodEndsAt: null }, trialEndsAt).startsAt).toEqual(trialEndsAt);
  });

  it('is never shorter than the shortest month, nor longer than the longest and the day it begins on, on any day of a year', () => {
    for (let at = brt('2027-01-01T12:00:00').getTime(); at < brt('2028-01-01T12:00:00').getTime(); at += DAY) {
      const month = freeMonthOf({ trialEndsAt, freePeriodEndsAt: null }, new Date(at));
      const length = month.endsAt.getTime() - month.startsAt.getTime();

      expect(length).toBeGreaterThan(28 * DAY);
      expect(length).toBeLessThanOrEqual(32 * DAY);
    }
  });
});
