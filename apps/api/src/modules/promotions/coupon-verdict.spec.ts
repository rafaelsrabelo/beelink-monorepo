// Libs
import { describe, expect, it } from 'vitest';

// App
import { couponRefusalOf, storedCodeOf, type CouponContext, type VerdictCoupon } from './coupon-verdict.js';

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
};
const context: CouponContext = { at: NOW, baseCents: 10000, fulfillment: 'DELIVERY', deliveryFeeCents: null, customerUses: 0 };
const FREE = { kind: 'FREE_SHIPPING', percentBps: null } as const;
const reasonOf = (row: Partial<VerdictCoupon> | null, given: Partial<CouponContext> = {}) => couponRefusalOf(row && { ...coupon, ...row }, { ...context, ...given })?.reason ?? null;

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
    // 10% of nine cents does not reach one.
    expect(reasonOf({}, { baseCents: 9 })).toBe('NOT_APPLICABLE');
    expect(reasonOf({}, { baseCents: 10 })).toBeNull();
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

  it('gives the first reason that holds: expired before exhausted, the customer’s limit before the minimum', () => {
    expect(reasonOf({ endsAt: at('2026-09-30T00:00:00.000Z'), usedCount: 10, isActive: false })).toBe('EXPIRED');
    expect(reasonOf({ usedCount: 10, isActive: false })).toBe('EXHAUSTED');
    expect(reasonOf({ minSubtotalCents: 15000 }, { customerUses: 1 })).toBe('CUSTOMER_LIMIT');
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
