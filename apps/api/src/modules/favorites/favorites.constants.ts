// Types
import type { CustomerFavoriteFilter, CustomerFavoriteSort } from '@harness-monorepo/contracts';

/**
 * A shopper keeps at most this many: plenty for one person, and a cap on what a script could pile
 * up. Favourites of products the shop drafted count too — they are kept, and come back with it.
 */
export const FAVORITES_MAX = 200;
export const FAVORITES_PAGE_SIZE = 24;
export const FAVORITES_PAGE_SIZE_MAX = 48;
/** `FAVORITES_MAX` over the smallest page. */
export const FAVORITES_PAGE_MAX = FAVORITES_MAX;

export const FAVORITE_FILTERS = ['PRICE_DROPPED', 'ON_SALE', 'SOLD_OUT'] as const satisfies readonly CustomerFavoriteFilter[];
export const FAVORITE_SORTS = ['RECENT', 'PRICE_ASC', 'DISCOUNT'] as const satisfies readonly CustomerFavoriteSort[];
