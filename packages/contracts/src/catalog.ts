/**
 * Which words a shop's public URLs are built from. A closed union and not free text: every value a
 * shopkeeper could type would become a reserved word, so setting the product word to `blusas` would
 * silently shadow a category of that name and leave it unreachable with nothing in the panel to
 * explain it. Five sensible values do not need three mechanisms to police them.
 *
 * It is editable, unlike `Store.slug`. That is safe only because the resolver accepts the words of
 * **every** vocabulary and answers a canonical path: after a change the old word still resolves and
 * redirects permanently, so a link already printed on a card keeps working.
 */
export type RouteVocabulary = "PT_BR" | "EN";

/**
 * The words one vocabulary resolves to, sent to the web so no component ever holds the literal
 * `"produtos"`. The web builds every storefront URL from these, which is what lets the vocabulary
 * change without a single string in the app following it.
 */
export interface StorefrontRouteWords {
  /** The segment that introduces a product: `/<shop>/<products>/<product slug>`. */
  products: string;
}

/**
 * The shopkeeper's own taxonomy of what they sell — the second URL segment, `/lessari/blusas`.
 *
 * It is not `StoreCategory`, which is the platform's taxonomy of shops and describes the shop
 * rather than the things in it.
 */
export interface PublicProductCategory {
  id: string;
  /** Unique inside the shop. Two shops both selling `blusas` is the normal case. */
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  /** How many available products sit in it — the storefront hides a category with none. */
  productCount: number;
}

/**
 * One image of a product. `position` is the shopkeeper's order; the first is what a card shows.
 */
export interface PublicProductImage {
  id: string;
  url: string;
  /** What a screen reader says. Null falls back to the product's name, never to the file name. */
  alt: string | null;
}

/**
 * What a grid needs and nothing more. The detail page asks for `PublicProduct`; a listing of forty
 * products must not carry forty descriptions, because this shape is what ends up in the cached HTML
 * of every indexed page.
 */
export interface PublicProductCard {
  id: string;
  slug: string;
  name: string;
  /**
   * Whole cents, never a float and never a formatted string. The legacy kept reais, cents and
   * `"R$ 25,00"` in one column and decided between them by guessing at the size of the number.
   */
  priceCents: number;
  /**
   * What the price was before, when the shop is showing a discount. Null means no discount; the
   * storefront computes the percentage rather than storing it, so the two can never disagree.
   */
  compareAtPriceCents: number | null;
  /** The first image, or null for a product whose photos are not in yet. */
  imageUrl: string | null;
  categorySlug: string | null;
}

/** One product's own page: the card plus everything only that page renders. */
export interface PublicProduct extends PublicProductCard {
  description: string | null;
  images: PublicProductImage[];
  category: PublicProductCategory | null;
}

/* ── what the panel reads and writes ─────────────────────────────────────── */

/** A category as its owner edits it: the public shape plus what only the owner may see. */
export interface ProductCategory extends PublicProductCategory {
  /** Manual ordering in the storefront and in the panel. Ties break on name. */
  position: number;
  /** A hidden category keeps its products; it is not a delete. */
  isActive: boolean;
  /** ISO-8601. */
  createdAt: string;
  /** ISO-8601. */
  updatedAt: string;
}

/** A product as its owner edits it. */
export interface Product extends PublicProduct {
  position: number;
  /** Marking a product unavailable hides it from the shop window without losing it. */
  isAvailable: boolean;
  /** ISO-8601. */
  createdAt: string;
  /** ISO-8601. */
  updatedAt: string;
}

export interface CreateProductCategoryPayload {
  name: string;
  /** Absent derives it from the name; sent explicitly it is still normalised the same way. */
  slug?: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
}

/**
 * Every field optional, and `slug` is among them — unlike a shop's. A category's segment is derived
 * from a name the shopkeeper will fix within the hour, and the old segment keeps resolving.
 */
export type UpdateProductCategoryPayload = Partial<CreateProductCategoryPayload>;

export interface CreateProductPayload {
  name: string;
  slug?: string;
  description?: string | null;
  priceCents: number;
  compareAtPriceCents?: number | null;
  categoryId?: string | null;
  isAvailable?: boolean;
  /** Ordered as sent; the first becomes the card's image. */
  images?: ProductImagePayload[];
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

export interface ProductImagePayload {
  url: string;
  alt?: string | null;
}

/**
 * Reordering is one request for the whole list, not one PATCH per row: a drag that moves the third
 * item to the top changes every position below it, and sending them one at a time leaves the list
 * in an order nobody chose if the tab closes halfway.
 */
export interface ReorderPayload {
  /** Every id of the list being ordered, in the order it should now have. */
  ids: string[];
}

/** The `errorCode` values the catalogue answers. The apps own the sentences. */
export type CatalogErrorCode =
  | "PRODUCT_NOT_FOUND"
  | "PRODUCT_SLUG_TAKEN"
  | "PRODUCT_CATEGORY_NOT_FOUND"
  | "PRODUCT_CATEGORY_SLUG_TAKEN"
  | "CATALOG_SLUG_RESERVED"
  | "CATALOG_SLUG_EMPTY"
  | "CATALOG_PRICE_INVALID"
  | "CATALOG_REORDER_MISMATCH";
