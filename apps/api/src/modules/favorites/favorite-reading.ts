// Types
import type { CustomerFavorite, CustomerFavoriteFilter, CustomerFavoritePage, CustomerFavoriteSort } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { isSoldOut } from '../catalog/catalog.visibility.js';
import { variantLabelOf } from '../orders/order-totals.js';

/** A shopper keeps at most this many: plenty for one person, and a cap on what a script could pile up. */
export const FAVORITES_MAX = 200;
export const FAVORITES_PAGE_SIZE = 24;
export const FAVORITES_PAGE_SIZE_MAX = 48;
/** `FAVORITES_MAX` over the smallest page. */
export const FAVORITES_PAGE_MAX = FAVORITES_MAX;

export const FAVORITE_FILTERS = ['PRICE_DROPPED', 'ON_SALE', 'SOLD_OUT'] as const satisfies readonly CustomerFavoriteFilter[];
export const FAVORITE_SORTS = ['RECENT', 'PRICE_ASC', 'DISCOUNT'] as const satisfies readonly CustomerFavoriteSort[];

/** The product's card fields and the liked combination's, in one read of every favourite. */
export const favoriteInclude = {
  product: {
    select: {
      id: true,
      slug: true,
      name: true,
      priceCents: true,
      compareAtPriceCents: true,
      trackStock: true,
      stockQuantity: true,
      images: { select: { url: true }, orderBy: { position: 'asc' }, take: 1 },
      _count: { select: { options: true } },
    },
  },
  variant: {
    select: {
      id: true,
      isActive: true,
      archivedAt: true,
      priceCents: true,
      compareAtPriceCents: true,
      trackStock: true,
      stockQuantity: true,
      imageUrl: true,
      values: { select: { option: { select: { name: true, position: true } }, value: { select: { name: true } } } },
    },
  },
} as const satisfies Prisma.CustomerFavoriteInclude;

export type FavoriteRow = Prisma.CustomerFavoriteGetPayload<{ include: typeof favoriteInclude }>;

/**
 * A favourite priced as of now. The liked combination is read while the shop sells it; once it is
 * archived or switched off the favourite reads its product, and claims no drop — the product's
 * cheapest is not the price the combination was liked at.
 */
export function toCustomerFavorite(row: FavoriteRow): CustomerFavorite {
  const { product } = row;
  const variant = row.variant && row.variant.isActive && row.variant.archivedAt === null ? row.variant : null;
  const priced = variant ?? product;
  const likedTheSameThing = variant !== null || row.variantId === null;

  return {
    productId: product.id,
    slug: product.slug,
    name: product.name,
    imageUrl: variant?.imageUrl ?? product.images[0]?.url ?? null,
    variant: variant
      ? {
          id: variant.id,
          label: variantLabelOf(variant.values.map((chosen) => ({ optionName: chosen.option.name, optionPosition: chosen.option.position, valueName: chosen.value.name }))),
        }
      : null,
    hasOptions: product._count.options > 0,
    priceCents: priced.priceCents,
    compareAtPriceCents: priced.compareAtPriceCents,
    likedPriceCents: row.likedPriceCents,
    likedAt: row.likedAt.toISOString(),
    priceDropCents: likedTheSameThing ? Math.max(0, row.likedPriceCents - priced.priceCents) : 0,
    onSale: priced.compareAtPriceCents !== null && priced.compareAtPriceCents > priced.priceCents,
    soldOut: isSoldOut(priced),
  } satisfies CustomerFavorite;
}

const MATCHES: Record<CustomerFavoriteFilter, (favorite: CustomerFavorite) => boolean> = {
  PRICE_DROPPED: (favorite) => favorite.priceDropCents > 0,
  ON_SALE: (favorite) => favorite.onSale,
  SOLD_OUT: (favorite) => favorite.soldOut,
};

/**
 * The saving against the dearest "before" the shopper has seen — the price they liked at, or the
 * shop's "de" — as a fraction of it. It is the struck-through price the list shows beside today's.
 */
export function savingOf(favorite: CustomerFavorite): number {
  const before = Math.max(favorite.priceDropCents > 0 ? favorite.likedPriceCents : 0, favorite.compareAtPriceCents ?? 0);
  return before > favorite.priceCents ? (before - favorite.priceCents) / before : 0;
}

const byLikedAtDesc = (a: CustomerFavorite, b: CustomerFavorite): number => b.likedAt.localeCompare(a.likedAt) || a.productId.localeCompare(b.productId);

const ORDERS: Record<CustomerFavoriteSort, (a: CustomerFavorite, b: CustomerFavorite) => number> = {
  RECENT: byLikedAtDesc,
  PRICE_ASC: (a, b) => a.priceCents - b.priceCents || byLikedAtDesc(a, b),
  DISCOUNT: (a, b) => savingOf(b) - savingOf(a) || byLikedAtDesc(a, b),
};

export interface FavoritePageRequest {
  filter?: CustomerFavoriteFilter;
  sort: CustomerFavoriteSort;
  page: number;
  pageSize: number;
}

/** One page of the filter, in the order asked, with every filter's count over all of them. */
export function pageOf(favorites: readonly CustomerFavorite[], request: FavoritePageRequest): CustomerFavoritePage {
  const matched = request.filter ? favorites.filter(MATCHES[request.filter]) : [...favorites];
  const start = (request.page - 1) * request.pageSize;

  return {
    favorites: matched.sort(ORDERS[request.sort]).slice(start, start + request.pageSize),
    total: matched.length,
    page: request.page,
    pageSize: request.pageSize,
    counts: {
      ALL: favorites.length,
      PRICE_DROPPED: favorites.filter(MATCHES.PRICE_DROPPED).length,
      ON_SALE: favorites.filter(MATCHES.ON_SALE).length,
      SOLD_OUT: favorites.filter(MATCHES.SOLD_OUT).length,
    },
  } satisfies CustomerFavoritePage;
}
