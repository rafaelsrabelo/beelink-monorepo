// Libs
import { describe, expect, it } from 'vitest';

// App
import { perUnitPatchOf, productCacheOf } from './variant-cache.js';
import type { VariantCacheRow } from './variant-cache.js';

function variant(overrides: Partial<VariantCacheRow> = {}): VariantCacheRow {
  return {
    isActive: true,
    priceCents: 18900,
    compareAtPriceCents: null,
    costCents: null,
    sku: null,
    barcode: null,
    trackStock: false,
    stockQuantity: null,
    weightGrams: null,
    lengthMm: null,
    widthMm: null,
    heightMm: null,
    ...overrides,
  };
}

describe('productCacheOf', () => {
  /** A product without options must read back exactly what was written to it. */
  it('copies a single variant as it is', () => {
    const only = variant({
      priceCents: 4990,
      compareAtPriceCents: 5990,
      costCents: 2000,
      sku: 'WH-900',
      barcode: '0789',
      trackStock: false,
      stockQuantity: 5,
      weightGrams: 900,
      lengthMm: 100,
      widthMm: 100,
      heightMm: 200,
    });

    const { isActive: _isActive, ...values } = only;
    expect(productCacheOf([only])).toEqual(values);
  });

  it('takes the price of the cheapest variant on sale, with that variant\'s "was" price', () => {
    const cache = productCacheOf([
      variant({ priceCents: 19900, compareAtPriceCents: 25900 }),
      variant({ priceCents: 18900, compareAtPriceCents: 21900 }),
      variant({ priceCents: 9900, isActive: false }),
    ]);

    expect(cache).toMatchObject({ priceCents: 18900, compareAtPriceCents: 21900 });
  });

  it('takes the codes, the cost and the box from the first variant on sale', () => {
    const cache = productCacheOf([
      variant({ isActive: false, sku: 'OFF', weightGrams: 1 }),
      variant({ sku: 'BLS-P-ARE', barcode: '1', costCents: 900, weightGrams: 300, lengthMm: 1, widthMm: 2, heightMm: 3 }),
      variant({ sku: 'BLS-M-ARE', weightGrams: 400 }),
    ]);

    expect(cache).toMatchObject({
      sku: 'BLS-P-ARE',
      barcode: '1',
      costCents: 900,
      weightGrams: 300,
      lengthMm: 1,
      widthMm: 2,
      heightMm: 3,
    });
  });

  it('counts the product, and sums the stock, only when every variant on sale is counted', () => {
    const counted = productCacheOf([
      variant({ trackStock: true, stockQuantity: 4 }),
      variant({ trackStock: true, stockQuantity: 2 }),
      variant({ trackStock: false, stockQuantity: 99, isActive: false }),
    ]);
    expect(counted).toMatchObject({ trackStock: true, stockQuantity: 6 });

    // One variant made to order is enough for the product never to be sold out.
    const madeToOrder = productCacheOf([
      variant({ trackStock: true, stockQuantity: 0 }),
      variant({ trackStock: false }),
    ]);
    expect(madeToOrder.trackStock).toBe(false);
  });

  it('is sold out when every counted variant on sale is at zero or unsaid', () => {
    const cache = productCacheOf([
      variant({ trackStock: true, stockQuantity: 0 }),
      variant({ trackStock: true, stockQuantity: null }),
    ]);

    expect(cache).toMatchObject({ trackStock: true, stockQuantity: 0 });
  });

  it('takes a product with nothing on sale off the shelf, and still prices it', () => {
    const cache = productCacheOf([
      variant({ isActive: false, priceCents: 5000 }),
      variant({ isActive: false, priceCents: 4000 }),
    ]);

    expect(cache).toMatchObject({ trackStock: true, stockQuantity: 0, priceCents: 4000 });
  });

  it('refuses a product with no variant at all', () => {
    expect(() => productCacheOf([])).toThrow();
  });
});

describe('perUnitPatchOf', () => {
  it('keeps the per-unit fields that were sent, nulls included, and nothing else', () => {
    expect(perUnitPatchOf({ priceCents: 100, sku: null, name: 'x', stockQuantity: undefined } as never)).toEqual({
      priceCents: 100,
      sku: null,
    });
  });
});
