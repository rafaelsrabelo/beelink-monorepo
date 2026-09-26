// App
import { totalsOf, variantLabelOf } from './order-totals.js';

describe('totalsOf', () => {
  it('adds the lines, the fee and takes the discount off, in cents', () => {
    expect(totalsOf([{ unitPriceCents: 8990, quantity: 2 }, { unitPriceCents: 5990, quantity: 1 }], 'DELIVERY', 1000, 500)).toEqual({
      subtotalCents: 23970,
      deliveryFeeCents: 1000,
      discountCents: 500,
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
});

describe('variantLabelOf', () => {
  it("names the values in the product's option order", () => {
    expect(
      variantLabelOf([
        { optionName: 'Peso', optionPosition: 1, valueName: '300 g' },
        { optionName: 'Sabor', optionPosition: 0, valueName: 'Uva' },
      ]),
    ).toBe('Sabor: Uva · Peso: 300 g');
  });

  it('says nothing for a product with no options', () => {
    expect(variantLabelOf([])).toBeNull();
  });
});
