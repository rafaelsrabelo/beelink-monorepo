// Libs
import { describe, expect, it } from 'vitest';

// Types
import type { EarningParts } from '../cashback/cashback-earning.js';

// App
import { earningOf } from '../cashback/cashback-earning.js';
import { commissionOf, rateOf, zeroed, type CommissionRates } from './affiliate-commission.js';

const parts = (change: Partial<EarningParts> = {}): EarningParts => ({
  lines: [
    { netCents: 6000, rateBps: null },
    { netCents: 4000, rateBps: null },
  ],
  subtotalCents: 10_000,
  promotionDiscountCents: 0,
  couponDiscountCents: 0,
  couponKind: null,
  manualDiscountCents: 0,
  cashbackUsedCents: 0,
  ...change,
});
const TABLE: CommissionRates = { defaultRateBps: 1000, byProduct: new Map([['whey', 2500]]) };

describe('an order’s affiliate commission', () => {
  it("takes a product's own rate on the table, else the table's", () => {
    expect(rateOf(TABLE, 'whey')).toBe(2500);
    expect(rateOf(TABLE, 'creatina')).toBe(1000);
    expect(rateOf(TABLE, null)).toBe(1000);
    expect(rateOf({ defaultRateBps: 1000, byProduct: new Map([['brinde', 0]]) }, 'brinde')).toBe(0);
  });

  it('is each line at its rate over what was paid for it, and the lines add up to the order', () => {
    const commission = commissionOf(parts(), ['whey', 'creatina'], TABLE);

    expect(commission).toEqual({
      baseCents: 10_000,
      commissionCents: 1900,
      lines: [
        { rateBps: 2500, baseCents: 6000, commissionCents: 1500 },
        { rateBps: 1000, baseCents: 4000, commissionCents: 400 },
      ],
    });
  });

  it('takes the coupon, the hand discount and the credit spent off every line in proportion, and never the delivery', () => {
    const commission = commissionOf(parts({ couponDiscountCents: 1000, couponKind: 'PERCENT', manualDiscountCents: 500, cashbackUsedCents: 500 }), ['whey', 'creatina'], TABLE);

    expect(commission.baseCents).toBe(8000);
    expect(commission.lines.map((line) => line.baseCents)).toEqual([4800, 3200]);
    expect(commission.commissionCents).toBe(1520);
    // A free delivery's coupon came off the delivery: nothing of it comes off the products.
    expect(commissionOf(parts({ couponDiscountCents: 1500, couponKind: 'FREE_SHIPPING' }), ['whey', 'creatina'], TABLE).baseCents).toBe(10_000);
  });

  it("is the number the cashback's own calculation gives at the same rates", () => {
    const priced = parts({ lines: [{ netCents: 3333, rateBps: 2500 }, { netCents: 3333, rateBps: 1000 }, { netCents: 3334, rateBps: 1000 }], couponDiscountCents: 777, couponKind: 'FIXED', cashbackUsedCents: 123 });
    const commission = commissionOf(priced, ['whey', 'creatina', 'barra'], TABLE);
    const cashback = earningOf({ enabled: true, mode: 'PRODUCT', rateBps: 1, minSubtotalCents: 0 }, priced);

    expect(commission.commissionCents).toBe(cashback?.earnedCents);
    expect(commission.lines.reduce((sum, line) => sum + line.commissionCents, 0)).toBe(commission.commissionCents);
    expect(commission.lines.reduce((sum, line) => sum + line.baseCents, 0)).toBe(commission.baseCents);
  });

  it('rounds down to the cent', () => {
    expect(commissionOf(parts({ lines: [{ netCents: 999, rateBps: null }], subtotalCents: 999 }), ['creatina'], TABLE).commissionCents).toBe(99);
  });

  it('owes nothing on products whose rate is 0, and nothing at all on an own purchase — the rates and the base kept', () => {
    expect(commissionOf(parts(), ['brinde', 'brinde'], { defaultRateBps: 0, byProduct: new Map() }).commissionCents).toBe(0);

    const own = zeroed(commissionOf(parts(), ['whey', 'creatina'], TABLE));
    expect(own.commissionCents).toBe(0);
    expect(own.baseCents).toBe(10_000);
    expect(own.lines).toEqual([
      { rateBps: 2500, baseCents: 6000, commissionCents: 0 },
      { rateBps: 1000, baseCents: 4000, commissionCents: 0 },
    ]);
  });
});
