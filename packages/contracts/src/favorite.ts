/**
 * A shopper's favourites at a shop (BEELINK-153): what they liked, with what it cost when they did,
 * so the shop can say it got cheaper. One per product; the combination is remembered when the
 * shopper chose one on the product's page, and a heart on a card likes the product as a whole.
 *
 * Every route is the shopper's own, under `/stores/:slug/customer/favorites`:
 * `GET` a page of them, `GET /ids` to paint the hearts, `PUT /:productId` to like and `DELETE
 * /:productId` to unlike — both idempotent, both answering 204.
 */

/** Which favourites a page shows. Absent is all of them. */
export type CustomerFavoriteFilter =
  /** Cheaper today than when it was liked. */
  | "PRICE_DROPPED"
  /** The shop shows a "de" price above today's. */
  | "ON_SALE"
  /** The shop counts it and has none left. */
  | "SOLD_OUT";

/** The order of a page: liked most recently first, cheapest first, or the biggest saving first. */
export type CustomerFavoriteSort = "RECENT" | "PRICE_ASC" | "DISCOUNT";

/** How the shopper asks for a page of their favourites. */
export interface CustomerFavoriteListQuery {
  filter?: CustomerFavoriteFilter;
  /** `RECENT` when absent. */
  sort?: CustomerFavoriteSort;
  page?: number;
  pageSize?: number;
}

/** The combination a favourite names, while the shop still sells it. */
export interface CustomerFavoriteVariant {
  id: string;
  /** "Sabor: Uva · Peso: 300 g", as an order line reads it; null for a product without options. */
  label: string | null;
}

/** One favourite as the shopper's list shows it, priced as of now. */
export interface CustomerFavorite {
  productId: string;
  slug: string;
  name: string;
  /** The combination's own photo when it has one, else the product's first. */
  imageUrl: string | null;
  /**
   * The combination liked on the product's page. Null for a product liked as a whole, and for one
   * whose combination the shop no longer sells — the favourite then reads the product.
   */
  variant: CustomerFavoriteVariant | null;
  /** Whether it sells combinations: a card sends one liked as a whole to its page to choose. */
  hasOptions: boolean;
  /**
   * Today's price of what was liked, in whole cents: the combination's, or for the product as a
   * whole the cheapest combination the shop sells, in stock or not — so stock coming back to a
   * cheaper one is not a price that dropped.
   */
  priceCents: number;
  /** The shop's "de" price today, above `priceCents`; null without a promotion. */
  compareAtPriceCents: number | null;
  /** What it cost when it was liked. */
  likedPriceCents: number;
  /** ISO-8601. */
  likedAt: string;
  /**
   * How much cheaper it is than when it was liked; 0 when it is not. Only the same thing is
   * compared: a favourite whose combination the shop stopped selling says 0, never a drop invented
   * by comparing that combination's old price with the product's cheapest.
   */
  priceDropCents: number;
  onSale: boolean;
  /** Derived by the shop window's rule, never the count. */
  soldOut: boolean;
}

/**
 * One page of the shopper's favourites. The counts are of every favourite, whatever the filter, so
 * each filter keeps saying how many it holds. A product the shop drafted is left out of all of it.
 */
export interface CustomerFavoritePage {
  favorites: CustomerFavorite[];
  total: number;
  page: number;
  pageSize: number;
  counts: Record<"ALL" | CustomerFavoriteFilter, number>;
}

/** The products this shopper liked at the shop, to paint the hearts. */
export interface CustomerFavoriteIds {
  productIds: string[];
}

/** Liking a product: with the combination chosen on its page, or none for the product as a whole. */
export interface LikeFavoritePayload {
  variantId?: string | null;
}

/** What the favourites answer; the apps own the sentences. */
export type FavoriteErrorCode =
  /** A draft, another shop's product, or none at all: one answer, so it tells nobody which ids exist where. */
  | "CUSTOMER_FAVORITE_PRODUCT_NOT_FOUND"
  /** A combination this product does not sell — switched off, archived, or another product's. */
  | "CUSTOMER_FAVORITE_VARIANT_NOT_FOUND"
  /** A two-hundred-and-first favourite: plenty for one person, and a cap on what a script could pile up. */
  | "CUSTOMER_FAVORITE_LIMIT";
