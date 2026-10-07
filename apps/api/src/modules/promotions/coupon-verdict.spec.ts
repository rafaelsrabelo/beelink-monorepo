// Libs
import { describe, expect, it } from 'vitest';

// App
import { couponRefusalOf, couponStandingRefusalOf, storedCodeOf, type CouponContext, type VerdictCoupon } from './coupon-verdict.js';

const NOW = new Date('2026-10-01T12:00:00.000Z');
const at = (iso: string) => new Date(iso);

const coupon: VerdictCoupon = {
  kind: 'PERCENT',
  percentBps: 1000,
  amountCents: null,
  minSubtotalCents: 0,
  startsAt: at('2026-09-01T00:00:00.000Z'),
  endsAt: at('2026-11-01T00:00:00.000Z'),
  isActive: true,
  maxUses: 10,
  maxUsesPerCustomer: 1,
  usedCount: 3,
  audience: 'EVERYONE',
};
const context: CouponContext = { at: NOW, baseCents: 10000, fulfillment: 'DELIVERY', deliveryFeeCents: null, customerUses: 0, firstPurchase: true };
const FREE = { kind: 'FREE_SHIPPING', percentBps: null } as const;
const WELCOME = { audience: 'FIRST_PURCHASE' } as const;
const reasonOf = (row: Partial<VerdictCoupon> | null, given: Partial<CouponContext> = {}) => couponRefusalOf(row && { ...coupon, ...row }, { ...context, ...given })?.reason ?? null;

/**
 * The half of the verdict that reads no cart: what the shop window asks before it says a code to a
 * customer. It is the full verdict's own first half, so the two cannot answer apart.
 */
describe('couponStandingRefusalOf', () => {
  const standingOf = (row: Partial<VerdictCoupon> | null, given: Partial<CouponContext> = {}) => couponStandingRefusalOf(row && { ...coupon, ...row }, { ...context, ...given })?.reason ?? null;

  it('answers for the coupon and its customer alone, whatever the cart', () => {
    expect(standingOf({})).toBeNull();
    expect(standingOf(null)).toBe('NOT_FOUND');
    expect(standingOf({ endsAt: at('2026-09-30T00:00:00.000Z') })).toBe('EXPIRED');
    expect(standingOf({ usedCount: 10 })).toBe('EXHAUSTED');
    expect(standingOf({ isActive: false })).toBe('INACTIVE');
    expect(standingOf({ startsAt: at('2026-10-02T00:00:00.000Z') })).toBe('INACTIVE');
    expect(standingOf({}, { customerUses: 1 })).toBe('CUSTOMER_LIMIT');
    expect(standingOf(WELCOME, { firstPurchase: false })).toBe('NOT_FIRST_PURCHASE');
    // What only a cart can say is not its to say.
    expect(standingOf({ minSubtotalCents: 50000 })).toBeNull();
    expect(standingOf(FREE, { fulfillment: 'PICKUP', deliveryFeeCents: 0 })).toBeNull();
  });

  it('is what the full verdict answers first, for every state of the coupon and the customer', () => {
    const rows: Partial<VerdictCoupon>[] = [{}, { endsAt: at('2026-09-30T00:00:00.000Z') }, { usedCount: 10 }, { isActive: false }, WELCOME, { minSubtotalCents: 50000 }, FREE];
    const customers: Partial<CouponContext>[] = [{}, { customerUses: 1 }, { firstPurchase: false }, { customerUses: null, firstPurchase: null }];

    for (const row of rows) {
      for (const given of customers) {
        const standing = standingOf(row, given);
        if (standing) expect(reasonOf(row, given)).toBe(standing);
        else expect([null, 'NOT_APPLICABLE', 'BELOW_MINIMUM']).toContain(reasonOf(row, given));
      }
    }
  });
});

describe('couponRefusalOf', () => {
  it('takes a coupon that is running, has uses left and fits the cart', () => {
    expect(reasonOf({})).toBeNull();
    expect(reasonOf(FREE)).toBeNull();
    expect(reasonOf(FREE, { deliveryFeeCents: 1200 })).toBeNull();
  });

  it('refuses one that would take nothing off, rather than spend its use', () => {
    expect(reasonOf(FREE, { fulfillment: 'PICKUP', deliveryFeeCents: 0 })).toBe('NOT_APPLICABLE');
    // A delivery already free has no fee to waive.
    expect(reasonOf(FREE, { deliveryFeeCents: 0 })).toBe('NOT_APPLICABLE');
    expect(reasonOf({}, { baseCents: 0 })).toBe('NOT_APPLICABLE');
    // A share is rounded up: anything left of the products gives at least a cent.
    expect(reasonOf({}, { baseCents: 9 })).toBeNull();
    expect(reasonOf({ kind: 'FIXED', percentBps: null, amountCents: 500 }, { baseCents: 1 })).toBeNull();
  });

  it('says why one is not taken', () => {
    expect(reasonOf(null)).toBe('NOT_FOUND');
    expect(reasonOf({ endsAt: at('2026-09-30T00:00:00.000Z') })).toBe('EXPIRED');
    expect(reasonOf({ usedCount: 10 })).toBe('EXHAUSTED');
    expect(reasonOf({ isActive: false })).toBe('INACTIVE');
    expect(reasonOf({ startsAt: at('2026-10-02T00:00:00.000Z') })).toBe('INACTIVE');
    expect(reasonOf({}, { customerUses: 1 })).toBe('CUSTOMER_LIMIT');
    expect(couponRefusalOf({ ...coupon, minSubtotalCents: 15000 }, context)).toEqual({ reason: 'BELOW_MINIMUM', minSubtotalCents: 15000 });
  });

  it('reads the period at the instant the order is placed', () => {
    expect(reasonOf({ endsAt: at('2026-09-30T00:00:00.000Z') }, { at: at('2026-09-29T00:00:00.000Z') })).toBeNull();
  });

  it('holds nobody to a limit by customer while nobody is identified, or when there is none', () => {
    expect(reasonOf({}, { customerUses: null })).toBeNull();
    expect(reasonOf({ maxUsesPerCustomer: null }, { customerUses: 7 })).toBeNull();
  });

  it('keeps a coupon for a first purchase from a customer with an order that stands, and from nobody else', () => {
    expect(reasonOf(WELCOME, { firstPurchase: true })).toBeNull();
    expect(reasonOf(WELCOME, { firstPurchase: false })).toBe('NOT_FIRST_PURCHASE');
    // A quote may come before its customer is chosen: nobody is refused for what cannot be said yet.
    expect(reasonOf(WELCOME, { firstPurchase: null })).toBeNull();
    // A coupon for everyone asks nothing of the customer's orders.
    expect(reasonOf({}, { firstPurchase: false })).toBeNull();
  });

  it('gives the first reason that holds: expired before exhausted, the customer’s limit before the minimum', () => {
    expect(reasonOf({ endsAt: at('2026-09-30T00:00:00.000Z'), usedCount: 10, isActive: false })).toBe('EXPIRED');
    expect(reasonOf({ usedCount: 10, isActive: false })).toBe('EXHAUSTED');
    expect(reasonOf({ minSubtotalCents: 15000 }, { customerUses: 1 })).toBe('CUSTOMER_LIMIT');
  });

  it('says a first purchase is over after the customer’s limit, and before what the cart lacks', () => {
    const bought = { firstPurchase: false } as const;
    expect(reasonOf({ ...WELCOME, isActive: false }, bought)).toBe('INACTIVE');
    expect(reasonOf(WELCOME, { ...bought, customerUses: 1 })).toBe('CUSTOMER_LIMIT');
    expect(reasonOf(WELCOME, { ...bought, baseCents: 0 })).toBe('NOT_FIRST_PURCHASE');
    expect(reasonOf({ ...WELCOME, minSubtotalCents: 15000 }, bought)).toBe('NOT_FIRST_PURCHASE');
  });

  it('waives a delivery fee whatever is left of the products, above its minimum', () => {
    expect(reasonOf(FREE, { baseCents: 0 })).toBeNull();
    expect(reasonOf({ ...FREE, minSubtotalCents: 5000 }, { baseCents: 4000 })).toBe('BELOW_MINIMUM');
  });
});

describe('storedCodeOf', () => {
  it('raises a code to how it is stored, and knows one no coupon could have', () => {
    expect(storedCodeOf('  bemvindo10 ')).toBe('BEMVINDO10');
    expect(storedCodeOf('straße')).toBeNull();
    expect(storedCodeOf('AB')).toBeNull();
    expect(storedCodeOf('bem vindo')).toBeNull();
  });
});
