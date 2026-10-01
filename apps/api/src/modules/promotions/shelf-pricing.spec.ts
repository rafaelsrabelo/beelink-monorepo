// Libs
import { describe, expect, it } from 'vitest';

// Types
import type { PublicProductCard, PublicProductDetail } from '@harness-monorepo/contracts';

// App
import type { PricingPromotion } from './discount-pricing.js';
import { promotedCard, promotedDetail, shelfPercentOf, shelfPriceOf } from './shelf-pricing.js';

const WHEY = { id: 'whey', categoryId: 'wheys', category: { parentId: 'proteins' } };
const LOOSE = { id: 'solto', categoryId: null, category: null };

function promotion(id: string, overrides: Partial<PricingPromotion>): PricingPromotion {
  return { id, name: id, scope: 'CART', discountKind: 'PERCENT', percentBps: null, amountCents: null, productIds: [], categoryIds: [], ...overrides };
}

const ten = promotion('Dez', { percentBps: 1000 });
const proteins = promotion('Proteínas', { scope: 'CATEGORIES', percentBps: 2000, categoryIds: ['proteins'] });

const card: PublicProductCard = {
  id: 'whey',
  slug: 'whey',
  name: 'Whey',
  priceCents: 18990,
  compareAtPriceCents: null,
  imageUrl: null,
  categorySlug: 'whey',
  priceRange: { minCents: 18990, maxCents: 20990 },
  rating: null,
};

describe('shelfPriceOf', () => {
  it('leaves a product no promotion reaches as the catalogue has it', () => {
    expect(shelfPriceOf(LOOSE, [proteins], 5990, null)).toEqual({ priceCents: 5990, compareAtPriceCents: null, promotionName: null });
    expect(shelfPriceOf(LOOSE, [], 5990, 6990)).toEqual({ priceCents: 5990, compareAtPriceCents: 6990, promotionName: null });
  });

  it('prices it by the best promotion that reaches it — through its category or the one above — with the catalogue’s price as what it was', () => {
    expect(shelfPriceOf(WHEY, [ten, proteins], 18990, null)).toEqual({ priceCents: 15192, compareAtPriceCents: 18990, promotionName: 'Proteínas' });
    expect(shelfPriceOf(LOOSE, [ten, proteins], 5990, null)).toEqual({ priceCents: 5391, compareAtPriceCents: 5990, promotionName: 'Dez' });
  });

  it('keeps the shop’s own "de" as what it was, so the two cuts read together', () => {
    expect(shelfPriceOf(LOOSE, [ten], 10000, 12000)).toEqual({ priceCents: 9000, compareAtPriceCents: 12000, promotionName: 'Dez' });
    // A "de" at or below the price is no "de".
    expect(shelfPriceOf(LOOSE, [ten], 10000, 10000).compareAtPriceCents).toBe(10000);
  });
});

describe('shelfPercentOf', () => {
  it('is what the badge prints: of the product’s own "de", of the promotion, or of the two together', () => {
    expect(shelfPercentOf(LOOSE, [], 10000, 12000)).toBe(16);
    expect(shelfPercentOf(LOOSE, [ten], 1899, null)).toBe(10);
    expect(shelfPercentOf(LOOSE, [ten], 10000, 12000)).toBe(25);
    expect(shelfPercentOf(LOOSE, [proteins], 10000, null)).toBe(0);
  });
});

describe('promotedCard and promotedDetail', () => {
  it('hand the card back untouched while no promotion runs', () => {
    expect(promotedCard(card, WHEY, [])).toBe(card);
  });

  it('put the promotion on the price, on what it was, on the range and by its name', () => {
    expect(promotedCard(card, WHEY, [ten])).toEqual({ ...card, priceCents: 17091, compareAtPriceCents: 18990, promotionName: 'Dez', priceRange: { minCents: 17091, maxCents: 18891 } });
    expect(promotedCard(card, LOOSE, [proteins])).toEqual({ ...card, promotionName: null });
  });

  it('price each combination of a product’s page by its own price', () => {
    const detail = {
      ...card,
      variants: [
        { id: 'v1', optionValueIds: [], priceCents: 18990, compareAtPriceCents: null, imageUrl: null, available: true },
        { id: 'v2', optionValueIds: [], priceCents: 20990, compareAtPriceCents: 22990, imageUrl: null, available: true },
      ],
    } as unknown as PublicProductDetail;

    expect(promotedDetail(detail, WHEY, [ten]).variants.map((variant) => [variant.priceCents, variant.compareAtPriceCents])).toEqual([
      [17091, 18990],
      [18891, 22990],
    ]);
    expect(promotedDetail(detail, WHEY, [])).toBe(detail);
  });
});
