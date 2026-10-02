// App
import { totalRefusalOf, totalsOf } from './order-totals.js';

describe('totalRefusalOf', () => {
  it('holds a total between zero and the cap, both ends allowed', () => {
    expect(totalRefusalOf(0)).toBeNull();
    expect(totalRefusalOf(100_000_000)).toBeNull();
    expect(totalRefusalOf(-1)).toBe('DISCOUNT_TOO_LARGE');
    expect(totalRefusalOf(100_000_001)).toBe('TOTAL_TOO_LARGE');
  });
});

describe('totalsOf', () => {
  it('adds the lines, the fee and takes the discount off, in cents', () => {
    expect(totalsOf([{ unitPriceCents: 8990, quantity: 2 }, { unitPriceCents: 5990, quantity: 1 }], 'DELIVERY', 1000, 500)).toEqual({
      subtotalCents: 23970,
      deliveryFeeCents: 1000,
      discountCents: 500,
      cashbackUsedCents: 0,
      totalCents: 24470,
    });
  });

  it('charges no delivery on a pick-up, whatever was typed', () => {
    expect(totalsOf([{ unitPriceCents: 1000, quantity: 1 }], 'PICKUP', 1500, 0)).toMatchObject({ deliveryFeeCents: 0, totalCents: 1000 });
  });

  it('refuses a discount that takes the total below zero, and allows one that takes it to zero', () => {
    expect(totalsOf([{ unitPriceCents: 1000, quantity: 1 }], 'DELIVERY', 500, 1501)).toBe('DISCOUNT_TOO_LARGE');
    expect(totalsOf([{ unitPriceCents: 1000, quantity: 1 }], 'DELIVERY', 500, 1500)).toMatchObject({ totalCents: 0 });
  });

  // Every amount has to fit the columns' INT4; one order past R$ 1.000.000,00 is a typo anyway.
  it('refuses a line or an order past the cap, before any amount can overflow', () => {
    expect(totalsOf([{ unitPriceCents: 100_000_000, quantity: 22 }], 'PICKUP', 0, 0)).toBe('TOTAL_TOO_LARGE');
    expect(totalsOf([{ unitPriceCents: 60_000_000, quantity: 1 }, { unitPriceCents: 60_000_000, quantity: 1 }], 'PICKUP', 0, 0)).toBe('TOTAL_TOO_LARGE');
    expect(totalsOf([{ unitPriceCents: 100_000_000, quantity: 1 }], 'DELIVERY', 1, 0)).toBe('TOTAL_TOO_LARGE');
    expect(totalsOf([{ unitPriceCents: 100_000_000, quantity: 1 }], 'PICKUP', 0, 0)).toMatchObject({ totalCents: 100_000_000 });
  });

  /** BEELINK-240: the customer's credit comes off the total apart from the discount, and never the fee. */
  it('takes the credit spent off the total, apart from the discount', () => {
    expect(totalsOf([{ unitPriceCents: 10_000, quantity: 1 }], 'DELIVERY', 1_500, 1_000, 3_000)).toEqual({
      subtotalCents: 10_000,
      deliveryFeeCents: 1_500,
      discountCents: 1_000,
      cashbackUsedCents: 3_000,
      totalCents: 7_500,
    });
  });
});
