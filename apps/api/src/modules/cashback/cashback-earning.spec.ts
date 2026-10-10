// Libs
import { describe, expect, it } from 'vitest';

// App
import { earningBaseOf, earningOf, quotedCashbackOf, type EarningParts, type EarningRules } from './cashback-earning.js';

/** One line of the whole subtotal unless the test names its own. */
const parts = (change: Partial<EarningParts> = {}): EarningParts => ({
  lines: [{ netCents: change.subtotalCents ?? 10_000, rateBps: null }],
  subtotalCents: 10_000,
  promotionDiscountCents: 0,
  couponDiscountCents: 0,
  couponKind: null,
  manualDiscountCents: 0,
  cashbackUsedCents: 0,
  ...change,
});
const ON: EarningRules = { enabled: true, mode: 'STORE', rateBps: 500, minSubtotalCents: 0 };

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
    expect(earningOf(ON, parts({ subtotalCents: 10_099 }))).toEqual({ earnedCents: 504, rateBps: 500 });
  });

  it('earns nothing with the cashback off, or with no rules saved', () => {
    expect(earningOf({ ...ON, enabled: false }, parts())).toBeNull();
    expect(earningOf(null, parts())).toBeNull();
  });

  it("earns from the shop's minimum up, the minimum itself included", () => {
    expect(earningOf({ ...ON, minSubtotalCents: 5000 }, parts({ subtotalCents: 4999 }))).toBeNull();
    expect(earningOf({ ...ON, minSubtotalCents: 5000 }, parts({ subtotalCents: 5000 }))).toEqual({ earnedCents: 250, rateBps: 500 });
  });

  it('earns nothing when the share is under a cent: no lot of nothing is made', () => {
    expect(earningOf({ ...ON, rateBps: 1 }, parts({ subtotalCents: 99 }))).toBeNull();
  });

  it("reads no product's own rate while the shop gives one rate", () => {
    expect(earningOf(ON, parts({ lines: [{ netCents: 10_000, rateBps: 2000 }] }))).toEqual({ earnedCents: 500, rateBps: 500 });
  });
});

describe('quotedCashbackOf', () => {
  it('says what the cart earns, at the rate it is worked out at', () => {
    expect(quotedCashbackOf(ON, parts({ subtotalCents: 10_099 }))).toEqual({ status: 'EARNS', earnedCents: 504, rateBps: 500 });
  });

  it("says what is missing to reach the shop's minimum", () => {
    expect(quotedCashbackOf({ ...ON, minSubtotalCents: 5000 }, parts({ subtotalCents: 3250 }))).toEqual({ status: 'BELOW_MINIMUM', missingCents: 1750, rateBps: 500 });
  });

  it('says nothing with the cashback off, or a share under a cent', () => {
    expect(quotedCashbackOf({ ...ON, enabled: false }, parts())).toBeNull();
    expect(quotedCashbackOf(null, parts())).toBeNull();
    expect(quotedCashbackOf({ ...ON, rateBps: 1 }, parts({ subtotalCents: 99 }))).toBeNull();
  });
});

/** BEELINK-240: credit spent earns nothing, and never takes the order under the minimum. */
describe('earning on an order that spent credit', () => {
  it('earns on what was paid in money, and holds the minimum against the products before the credit', () => {
    // R$ 100,00 of products, R$ 30,00 of it paid with credit, a R$ 80,00 minimum.
    const spent = parts({ cashbackUsedCents: 3_000 });
    expect(earningOf({ ...ON, minSubtotalCents: 8_000 }, spent)).toEqual({ earnedCents: 350, rateBps: 500 });
    expect(quotedCashbackOf({ ...ON, minSubtotalCents: 8_000 }, spent)).toEqual({ status: 'EARNS', earnedCents: 350, rateBps: 500 });
  });
});

/** BEELINK-313: a shop that gives by product — each line at its product's own rate, one without earning nothing. */
describe('earning by product', () => {
  const BY_PRODUCT: EarningRules = { ...ON, mode: 'PRODUCT' };
  // R$ 60,00 at 10% and R$ 40,00 with no rate: R$ 6,00 on R$ 100,00.
  const mixed = { subtotalCents: 10_000, lines: [{ netCents: 6_000, rateBps: 1000 }, { netCents: 4_000, rateBps: null }] };

  it("is each line at its product's rate, and records the order's average", () => {
    expect(earningOf(BY_PRODUCT, parts(mixed))).toEqual({ earnedCents: 600, rateBps: 600 });
  });

  it("never reads the shop's own rate: products without one earn nothing", () => {
    expect(earningOf(BY_PRODUCT, parts({ lines: [{ netCents: 10_000, rateBps: null }] }))).toBeNull();
    expect(quotedCashbackOf({ ...BY_PRODUCT, minSubtotalCents: 20_000 }, parts({ lines: [{ netCents: 10_000, rateBps: null }] }))).toBeNull();
  });

  it("shares the order's own discounts among the lines by what each costs", () => {
    // A R$ 10,00 coupon and R$ 10,00 of credit leave R$ 80,00 paid: 80% of each line, so 80% of R$ 6,00.
    expect(earningOf(BY_PRODUCT, parts({ ...mixed, couponDiscountCents: 1_000, couponKind: 'FIXED', cashbackUsedCents: 1_000 }))).toEqual({ earnedCents: 480, rateBps: 600 });
  });

  it("holds the shop's minimum against the whole order, and says the cart's rate below it", () => {
    expect(quotedCashbackOf({ ...BY_PRODUCT, minSubtotalCents: 15_000 }, parts(mixed))).toEqual({ status: 'BELOW_MINIMUM', missingCents: 5_000, rateBps: 600 });
  });

  it('records a rate of at least one basis point for an order that earned a cent', () => {
    const lines = [{ netCents: 100, rateBps: 100 }, { netCents: 999_900, rateBps: null }];
    expect(earningOf(BY_PRODUCT, parts({ subtotalCents: 1_000_000, lines }))).toEqual({ earnedCents: 1, rateBps: 1 });
  });

  it('holds whole past what a double does: the largest order at the largest rate', () => {
    expect(earningOf(BY_PRODUCT, parts({ subtotalCents: 100_000_000, lines: [{ netCents: 100_000_000, rateBps: 10_000 }] }))).toEqual({ earnedCents: 100_000_000, rateBps: 10_000 });
  });
});
