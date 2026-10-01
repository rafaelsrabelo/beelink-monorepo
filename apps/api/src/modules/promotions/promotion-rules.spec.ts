// Libs
import { describe, expect, it } from 'vitest';

// App
import { assertPeriod, discountOf, targetsOf } from './promotion-rules.js';

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

describe('assertPeriod', () => {
  const start = new Date('2026-10-01T00:00:00.000Z');

  it('takes an end after the start, or none', () => {
    expect(codeOf(() => assertPeriod(start, new Date('2026-10-01T00:00:00.001Z'), 'PROMOTION_PERIOD_INVALID'))).toBeUndefined();
    expect(codeOf(() => assertPeriod(start, null, 'PROMOTION_PERIOD_INVALID'))).toBeUndefined();
    expect(codeOf(() => assertPeriod(start, undefined, 'COUPON_PERIOD_INVALID'))).toBeUndefined();
  });

  it('refuses an end at the start or before it', () => {
    expect(codeOf(() => assertPeriod(start, start, 'PROMOTION_PERIOD_INVALID'))).toBe('PROMOTION_PERIOD_INVALID');
    expect(codeOf(() => assertPeriod(start, new Date('2026-09-30T00:00:00.000Z'), 'COUPON_PERIOD_INVALID'))).toBe('COUPON_PERIOD_INVALID');
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
