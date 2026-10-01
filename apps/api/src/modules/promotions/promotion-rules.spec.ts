// Libs
import { describe, expect, it } from 'vitest';

// App
import { discountOf, periodOf, targetsOf } from './promotion-rules.js';

/** The `errorCode` a refusal answers. */
function codeOf(run: () => unknown): string | undefined {
  try {
    run();
  } catch (error) {
    return (error as { getResponse(): { errorCode?: string } }).getResponse().errorCode;
  }
  return undefined;
}

describe('discountOf', () => {
  it('keeps the value its kind asks for, and nulls the other', () => {
    expect(discountOf('PERCENT', 1000, undefined, 'PROMOTION_DISCOUNT_INVALID')).toEqual({ percentBps: 1000, amountCents: null });
    expect(discountOf('FIXED', null, 500, 'PROMOTION_DISCOUNT_INVALID')).toEqual({ percentBps: null, amountCents: 500 });
    expect(discountOf('FREE_SHIPPING', undefined, null, 'COUPON_DISCOUNT_INVALID')).toEqual({ percentBps: null, amountCents: null });
  });

  it('refuses a kind with no value, with the other kind’s, or with both', () => {
    expect(codeOf(() => discountOf('PERCENT', null, null, 'PROMOTION_DISCOUNT_INVALID'))).toBe('PROMOTION_DISCOUNT_INVALID');
    expect(codeOf(() => discountOf('PERCENT', null, 500, 'PROMOTION_DISCOUNT_INVALID'))).toBe('PROMOTION_DISCOUNT_INVALID');
    expect(codeOf(() => discountOf('PERCENT', 1000, 500, 'COUPON_DISCOUNT_INVALID'))).toBe('COUPON_DISCOUNT_INVALID');
    expect(codeOf(() => discountOf('FIXED', 1000, null, 'COUPON_DISCOUNT_INVALID'))).toBe('COUPON_DISCOUNT_INVALID');
    expect(codeOf(() => discountOf('FREE_SHIPPING', 1000, null, 'COUPON_DISCOUNT_INVALID'))).toBe('COUPON_DISCOUNT_INVALID');
  });
});

describe('periodOf', () => {
  const start = '2026-10-01T00:00:00.000Z';

  it('reads the two instants, with an end after the start or none', () => {
    expect(periodOf(start, '2026-10-01T00:00:00.001Z', 'PROMOTION_PERIOD_INVALID')).toEqual({ startsAt: new Date(start), endsAt: new Date('2026-10-01T00:00:00.001Z') });
    expect(periodOf(start, null, 'PROMOTION_PERIOD_INVALID')).toEqual({ startsAt: new Date(start), endsAt: null });
    expect(periodOf('2026-09-30T21:00:00-03:00', undefined, 'COUPON_PERIOD_INVALID')).toEqual({ startsAt: new Date(start), endsAt: null });
  });

  it('refuses an end at the start or before it', () => {
    expect(codeOf(() => periodOf(start, start, 'PROMOTION_PERIOD_INVALID'))).toBe('PROMOTION_PERIOD_INVALID');
    expect(codeOf(() => periodOf(start, '2026-09-30T00:00:00.000Z', 'COUPON_PERIOD_INVALID'))).toBe('COUPON_PERIOD_INVALID');
  });

  it('refuses an instant off the calendar, and one that is no date at all', () => {
    expect(codeOf(() => periodOf('1999-12-31T23:59:59.999Z', null, 'PROMOTION_PERIOD_INVALID'))).toBe('PROMOTION_PERIOD_INVALID');
    expect(codeOf(() => periodOf(start, '2100-01-01T00:00:00.001Z', 'COUPON_PERIOD_INVALID'))).toBe('COUPON_PERIOD_INVALID');
    expect(codeOf(() => periodOf('amanhã', null, 'COUPON_PERIOD_INVALID'))).toBe('COUPON_PERIOD_INVALID');
  });
});

describe('targetsOf', () => {
  const A = '0199a1b2-0000-7000-8000-00000000000a';
  const B = '0199a1b2-0000-7000-8000-00000000000b';

  it('takes the list its scope asks for, each id once and in lower case', () => {
    expect(targetsOf('CART', undefined, [])).toEqual({ productIds: [], categoryIds: [] });
    expect(targetsOf('PRODUCTS', [A, B, A.toUpperCase()], undefined)).toEqual({ productIds: [A, B], categoryIds: [] });
    expect(targetsOf('CATEGORIES', [], [B])).toEqual({ productIds: [], categoryIds: [B] });
  });

  it('refuses a scope with no list of its own, or with another scope’s', () => {
    expect(codeOf(() => targetsOf('PRODUCTS', [], undefined))).toBe('PROMOTION_TARGETS_INVALID');
    expect(codeOf(() => targetsOf('CATEGORIES', [A], undefined))).toBe('PROMOTION_TARGETS_INVALID');
    expect(codeOf(() => targetsOf('PRODUCTS', [A], [B]))).toBe('PROMOTION_TARGETS_INVALID');
    expect(codeOf(() => targetsOf('CART', [A], undefined))).toBe('PROMOTION_TARGETS_INVALID');
    expect(codeOf(() => targetsOf('CART', undefined, [B]))).toBe('PROMOTION_TARGETS_INVALID');
  });
});
