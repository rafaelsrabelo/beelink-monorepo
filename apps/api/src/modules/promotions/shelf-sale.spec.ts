// Libs
import { describe, expect, it } from 'vitest';

// Types
import type { ProductFieldRefs } from '../../generated/prisma/models/Product.js';

// App
import type { PricingPromotion } from './discount-pricing.js';
import { plainSale, shelfSaleOf } from './shelf-sale.js';

const PRICE = { name: 'priceCents' } as unknown as ProductFieldRefs['priceCents'];
const OWN = { compareAtPriceCents: { gt: PRICE } };
/** A product given away takes no promotion: nothing reaches it. */
const PRICED = { priceCents: { gt: 0 } };

function promotion(id: string, overrides: Partial<PricingPromotion>): PricingPromotion {
  return { id, name: id, scope: 'CART', discountKind: 'PERCENT', percentBps: null, amountCents: null, productIds: [], categoryIds: [], ...overrides };
}

const wheys = promotion('whey', { scope: 'PRODUCTS', percentBps: 1500, productIds: ['p1', 'p2'] });
const proteins = promotion('proteinas', { scope: 'CATEGORIES', discountKind: 'FIXED', amountCents: 1000, categoryIds: ['k1'] });
const wheysReach = { AND: [PRICED, { id: { in: ['p1', 'p2'] } }] };
const proteinsReach = { AND: [PRICED, { OR: [{ categoryId: { in: ['k1'] } }, { category: { parentId: { in: ['k1'] } } }] }] };

describe('shelfSaleOf', () => {
  it('is the two columns alone while no promotion runs', () => {
    const sale = shelfSaleOf([], [], PRICE);
    expect(sale.onSale).toEqual(plainSale(PRICE).onSale);
    expect(sale.atLeast(20)).toEqual({ discountPercent: { gte: 20 } });
  });

  it('counts as on sale what a promotion reaches: its products, or its categories and what sits under them — never one given away', () => {
    expect(shelfSaleOf([wheys, proteins], [], PRICE).onSale).toEqual({ OR: [OWN, wheysReach, proteinsReach] });
  });

  it('reaches every priced product once a promotion is on the whole cart', () => {
    const sale = shelfSaleOf([wheys, promotion('tudo', { percentBps: 500 })], [], PRICE);
    expect(sale.onSale).toEqual({ OR: [OWN, wheysReach, PRICED] });
    // 5% over everything is not "10% or more" of anything.
    expect(sale.atLeast(10)).toEqual({ OR: [{ discountPercent: { gte: 10 } }, wheysReach, { id: { in: [] } }] });
    expect(sale.atLeast(5)).toEqual({ OR: [{ discountPercent: { gte: 5 } }, wheysReach, PRICED, { id: { in: [] } }] });
  });

  it('puts in a cut the percentages that reach it, a fixed amount where the price makes it enough, and the products marked down twice', () => {
    const sale = shelfSaleOf([wheys, proteins], [{ id: 'p9', percent: 25 }, { id: 'p8', percent: 12 }], PRICE);

    // R$ 10,00 off is 10% of anything up to R$ 100,00.
    expect(sale.atLeast(10)).toEqual({
      OR: [{ discountPercent: { gte: 10 } }, wheysReach, { AND: [proteinsReach, { priceCents: { lte: 10000 } }] }, { id: { in: ['p9', 'p8'] } }],
    });
    // 15% does not reach 20; R$ 10,00 is 20% of up to R$ 50,00; of the two marked down twice, one reaches.
    expect(sale.atLeast(20)).toEqual({ OR: [{ discountPercent: { gte: 20 } }, { AND: [proteinsReach, { priceCents: { lte: 5000 } }] }, { id: { in: ['p9'] } }] });
    expect(sale.atLeast(30)).toEqual({ OR: [{ discountPercent: { gte: 30 } }, { AND: [proteinsReach, { priceCents: { lte: 3333 } }] }, { id: { in: [] } }] });
  });

  it('never asks the price column for more than it can hold', () => {
    // R$ 1.000.000,00 off, against a cut of 2%: fifty million reais, past INT4.
    const huge = promotion('milhao', { scope: 'PRODUCTS', discountKind: 'FIXED', amountCents: 100_000_000, productIds: ['p1'] });
    const cut = shelfSaleOf([huge], [], PRICE).atLeast(2);
    expect(JSON.stringify(cut)).toContain('"lte":2147483647');
  });
});
