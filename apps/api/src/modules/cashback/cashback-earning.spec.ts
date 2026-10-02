// Libs
import { describe, expect, it } from 'vitest';

// App
import { earningBaseOf, earningOf, quotedCashbackOf, type EarningParts } from './cashback-earning.js';

const parts = (change: Partial<EarningParts> = {}): EarningParts => ({
  subtotalCents: 10_000,
  promotionDiscountCents: 0,
  couponDiscountCents: 0,
  couponKind: null,
  manualDiscountCents: 0,
  cashbackUsedCents: 0,
  ...change,
});
const ON = { enabled: true, rateBps: 500, minSubtotalCents: 0 };

describe('earningBaseOf', () => {
  it('is what was paid for the products: the subtotal less the promotions, the coupon, the hand discount and the credit spent', () => {
    expect(earningBaseOf(parts({ promotionDiscountCents: 1000, couponDiscountCents: 900, couponKind: 'PERCENT', manualDiscountCents: 100, cashbackUsedCents: 500 }))).toBe(7500);
  });

  it("leaves a free delivery's coupon out: it came off the delivery", () => {
    expect(earningBaseOf(parts({ couponDiscountCents: 1500, couponKind: 'FREE_SHIPPING' }))).toBe(10_000);
  });

  it('never goes below zero, when a hand discount also covered the delivery', () => {
    expect(earningBaseOf(parts({ manualDiscountCents: 12_000 }))).toBe(0);
  });
});

describe('earningOf', () => {
  it('is the rate over the base, rounded down to the cent, with the rate it was worked out at', () => {
    expect(earningOf(ON, 10_099)).toEqual({ earnedCents: 504, rateBps: 500 });
  });

  it('earns nothing with the cashback off, or with no rules saved', () => {
    expect(earningOf({ ...ON, enabled: false }, 10_000)).toBeNull();
    expect(earningOf(null, 10_000)).toBeNull();
  });

  it("earns from the shop's minimum up, the minimum itself included", () => {
    expect(earningOf({ ...ON, minSubtotalCents: 5000 }, 4999)).toBeNull();
    expect(earningOf({ ...ON, minSubtotalCents: 5000 }, 5000)).toEqual({ earnedCents: 250, rateBps: 500 });
  });

  it('earns nothing when the share is under a cent: no lot of nothing is made', () => {
    expect(earningOf({ ...ON, rateBps: 1 }, 99)).toBeNull();
  });
});

describe('quotedCashbackOf', () => {
  it('says what the cart earns, at the rate it is worked out at', () => {
    expect(quotedCashbackOf(ON, 10_099)).toEqual({ status: 'EARNS', earnedCents: 504, rateBps: 500 });
  });

  it("says what is missing to reach the shop's minimum", () => {
    expect(quotedCashbackOf({ ...ON, minSubtotalCents: 5000 }, 3250)).toEqual({ status: 'BELOW_MINIMUM', missingCents: 1750, rateBps: 500 });
  });

  it('says nothing with the cashback off, or a share under a cent', () => {
    expect(quotedCashbackOf({ ...ON, enabled: false }, 10_000)).toBeNull();
    expect(quotedCashbackOf(null, 10_000)).toBeNull();
    expect(quotedCashbackOf({ ...ON, rateBps: 1 }, 99)).toBeNull();
  });
});

/** BEELINK-240: credit spent earns nothing, and never takes the order under the minimum. */
describe('earning on an order that spent credit', () => {
  it('earns on what was paid in money, and holds the minimum against the products before the credit', () => {
    // R$ 100,00 of products, R$ 30,00 of it paid with credit, a R$ 80,00 minimum.
    expect(earningOf({ ...ON, minSubtotalCents: 8_000 }, 7_000, 10_000)).toEqual({ earnedCents: 350, rateBps: 500 });
    expect(quotedCashbackOf({ ...ON, minSubtotalCents: 8_000 }, 7_000, 10_000)).toEqual({ status: 'EARNS', earnedCents: 350, rateBps: 500 });
  });
});
