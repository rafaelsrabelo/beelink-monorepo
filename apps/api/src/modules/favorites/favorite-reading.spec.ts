// Libs
import { describe, expect, it } from 'vitest';

// Types
import type { CustomerFavorite } from '@harness-monorepo/contracts';

// App
import { type FavoriteRow, pageOf, savingOf, toCustomerFavorite, wholeProductPriceOf } from './favorite-reading.js';

const LIKED_AT = new Date('2026-09-18T12:00:00.000Z');

function productOf(overrides: Partial<FavoriteRow['product']> = {}): FavoriteRow['product'] {
  return {
    id: 'p-1',
    slug: 'haze',
    name: 'Pré-Treino Haze',
    priceCents: 20990,
    compareAtPriceCents: null,
    trackStock: false,
    stockQuantity: null,
    images: [{ url: 'https://img/haze.jpg' }],
    variants: [{ priceCents: 20990, compareAtPriceCents: null }],
    _count: { options: 1 },
    ...overrides,
  };
}

function variantOf(overrides: Partial<NonNullable<FavoriteRow['variant']>> = {}): NonNullable<FavoriteRow['variant']> {
  return {
    id: 'v-1',
    isActive: true,
    archivedAt: null,
    priceCents: 20990,
    compareAtPriceCents: null,
    trackStock: true,
    stockQuantity: 3,
    imageUrl: null,
    values: [{ option: { name: 'Sabor', position: 0 }, value: { name: 'Frutas vermelhas' } }],
    ...overrides,
  };
}

function rowOf(overrides: Partial<FavoriteRow> = {}): FavoriteRow {
  const variant = overrides.variant === undefined ? null : overrides.variant;
  return {
    id: 'f-1',
    customerId: 'c-1',
    productId: 'p-1',
    variantId: variant?.id ?? null,
    likedPriceCents: 20990,
    likedAt: LIKED_AT,
    seenPriceCents: 20990,
    seenSoldOut: false,
    product: productOf(),
    ...overrides,
    variant,
  };
}

describe('toCustomerFavorite', () => {
  it('prices a combination liked on the page by the combination, and says how much it dropped', () => {
    const favorite = toCustomerFavorite(rowOf({ likedPriceCents: 23990, variant: variantOf({ priceCents: 20990, imageUrl: 'https://img/red.jpg' }) }));

    expect(favorite).toMatchObject({
      variant: { id: 'v-1', label: 'Sabor: Frutas vermelhas' },
      imageUrl: 'https://img/red.jpg',
      priceCents: 20990,
      likedPriceCents: 23990,
      likedAt: '2026-09-18T12:00:00.000Z',
      priceDropCents: 3000,
      onSale: false,
      soldOut: false,
    });
  });

  it('prices a product liked as a whole by its cheapest combination on sale, and a dearer price is no drop', () => {
    const favorite = toCustomerFavorite(rowOf({ likedPriceCents: 18990, product: productOf({ variants: [{ priceCents: 20990, compareAtPriceCents: 24990 }] }) }));

    expect(favorite).toMatchObject({ variant: null, imageUrl: 'https://img/haze.jpg', priceCents: 20990, compareAtPriceCents: 24990, priceDropCents: 0, onSale: true });
  });

  it('reads the product once the combination is archived or switched off, and claims no drop', () => {
    for (const gone of [variantOf({ archivedAt: new Date() }), variantOf({ isActive: false })]) {
      const favorite = toCustomerFavorite(rowOf({ likedPriceCents: 30990, variant: gone, product: productOf({ variants: [{ priceCents: 9990, compareAtPriceCents: null }] }) }));
      expect(favorite).toMatchObject({ variant: null, priceCents: 9990, priceDropCents: 0 });
    }
  });

  it("does not read stock coming back to a cheaper combination as a drop: the product's cache follows stock", () => {
    // The cache says 19990 now that Uva is back; the cheapest combination on sale was 19990 all along.
    const product = productOf({ priceCents: 19990, variants: [{ priceCents: 19990, compareAtPriceCents: null }] });
    expect(toCustomerFavorite(rowOf({ likedPriceCents: 19990, product }))).toMatchObject({ priceCents: 19990, priceDropCents: 0 });
  });

  it("keeps the product's cache for one that sells no combination at all", () => {
    expect(wholeProductPriceOf({ priceCents: 5000, compareAtPriceCents: 6000, variants: [] })).toEqual({ priceCents: 5000, compareAtPriceCents: 6000, variants: [] });
  });

  it('is sold out by the shop window’s rule, on the combination when it is the one read', () => {
    expect(toCustomerFavorite(rowOf({ variant: variantOf({ stockQuantity: 0 }) })).soldOut).toBe(true);
    expect(toCustomerFavorite(rowOf({ variant: variantOf({ trackStock: false, stockQuantity: 0 }) })).soldOut).toBe(false);
    expect(toCustomerFavorite(rowOf({ product: productOf({ trackStock: true, stockQuantity: null }) })).soldOut).toBe(true);
  });

  it('labels a product without options with no label, and says whether it has options', () => {
    const favorite = toCustomerFavorite(rowOf({ product: productOf({ _count: { options: 0 }, images: [] }), variant: variantOf({ values: [] }) }));
    expect(favorite).toMatchObject({ variant: { id: 'v-1', label: null }, hasOptions: false, imageUrl: null });
  });
});

function favoriteOf(id: string, overrides: Partial<CustomerFavorite> = {}): CustomerFavorite {
  return {
    productId: id,
    slug: id,
    name: id,
    imageUrl: null,
    variant: null,
    hasOptions: false,
    priceCents: 10000,
    compareAtPriceCents: null,
    likedPriceCents: 10000,
    likedAt: '2026-09-01T00:00:00.000Z',
    priceDropCents: 0,
    onSale: false,
    soldOut: false,
    ...overrides,
  };
}

describe('savingOf', () => {
  it('measures against the dearest "before": the liked price when it dropped, or the shop\'s "de"', () => {
    expect(savingOf(favoriteOf('a', { priceCents: 7500, likedPriceCents: 10000, priceDropCents: 2500 }))).toBe(0.25);
    expect(savingOf(favoriteOf('b', { priceCents: 7500, compareAtPriceCents: 15000, onSale: true, likedPriceCents: 10000, priceDropCents: 2500 }))).toBe(0.5);
    expect(savingOf(favoriteOf('c'))).toBe(0);
  });
});

describe('pageOf', () => {
  const favorites = [
    favoriteOf('old-cheap', { likedAt: '2026-08-01T00:00:00.000Z', priceCents: 2990 }),
    favoriteOf('dropped', { likedAt: '2026-09-10T00:00:00.000Z', priceCents: 9000, priceDropCents: 1000 }),
    favoriteOf('on-sale', { likedAt: '2026-09-05T00:00:00.000Z', priceCents: 5000, compareAtPriceCents: 10000, onSale: true }),
    favoriteOf('sold-out', { likedAt: '2026-09-20T00:00:00.000Z', soldOut: true }),
  ];
  const ids = (page: { favorites: CustomerFavorite[] }) => page.favorites.map((favorite) => favorite.productId);

  it('counts every filter over all of them, whatever the filter', () => {
    const page = pageOf(favorites, { filter: 'SOLD_OUT', sort: 'RECENT', page: 1, pageSize: 24 });
    expect(ids(page)).toEqual(['sold-out']);
    expect(page.total).toBe(1);
    expect(page.counts).toEqual({ ALL: 4, PRICE_DROPPED: 1, ON_SALE: 1, SOLD_OUT: 1 });
  });

  it('orders by the like, by price, and by the biggest saving', () => {
    expect(ids(pageOf(favorites, { sort: 'RECENT', page: 1, pageSize: 24 }))).toEqual(['sold-out', 'dropped', 'on-sale', 'old-cheap']);
    expect(ids(pageOf(favorites, { sort: 'PRICE_ASC', page: 1, pageSize: 24 }))).toEqual(['old-cheap', 'on-sale', 'dropped', 'sold-out']);
    expect(ids(pageOf(favorites, { sort: 'DISCOUNT', page: 1, pageSize: 24 }))).toEqual(['on-sale', 'dropped', 'sold-out', 'old-cheap']);
  });

  it('pages the match, and a page past the end is empty rather than an error', () => {
    expect(ids(pageOf(favorites, { sort: 'RECENT', page: 2, pageSize: 3 }))).toEqual(['old-cheap']);
    expect(pageOf(favorites, { sort: 'RECENT', page: 3, pageSize: 3 })).toMatchObject({ favorites: [], total: 4, page: 3 });
  });
});
