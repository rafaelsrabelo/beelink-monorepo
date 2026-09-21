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
  /**
   * The index of every category. A single category has no word in front of it — `/<shop>/<blusas>`
   * — which is what makes this one a reserved segment rather than a prefix.
   */
  categories: string;
  /** Where the shop's search box posts, its term in `?q=`: `/<shop>/<search>?q=croche`. */
  search: string;
  /**
   * The basket. It has a word before it holds anything, because the header carries its icon from
   * the first day and an icon that goes nowhere teaches a visitor the rest of the page is a
   * mock-up. `RESERVED_PATH_SEGMENTS` has held `carrinho` and `cart` since the beginning for
   * exactly this.
   */
  cart: string;
}

/**
 * The shopkeeper's own taxonomy of what they sell — the second URL segment, `/lessari/blusas`.
 *
 * It is not `StoreCategory`, which is the platform's taxonomy of shops and describes the shop
 * rather than the things in it.
 */
/**
 * How wide a category sits on the landing page, when the shopkeeper puts it there.
 *
 * A shape rather than a column count: full width is the poster at the top, two-across is a banner
 * with room for artwork, three-across is a card with room for a name and a line.
 */
export type ShowcaseLayout = "FULL" | "HALVES" | "THIRDS";

export interface PublicProductCategory {
  id: string;
  /** Unique inside the shop. Two shops both selling `blusas` is the normal case. */
  slug: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  /**
   * The category this one sits under, or null for a top level. Exactly two levels: the URL is
   * `/<shop>/<category>` flat, so a grandchild would have nowhere to live that its grandparent
   * does not already occupy.
   */
  parentSlug: string | null;
  /**
   * The shape this category takes on the landing page, or null to keep it out of it.
   *
   * A category and not a separate "banner" row: the two were the same thing wearing different
   * names — a title, a picture, a line and somewhere to go, which a category already is.
   */
  showcaseLayout: ShowcaseLayout | null;
  /**
   * How many available products sit in it, **its subcategories included** — the storefront hides a
   * category with none, and a parent whose products are all one level down would otherwise be a
   * heading that vanishes from the menu while the things under it are still for sale.
   */
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

/**
 * One answer for one shop-window page: the navigation and a page of what the filter matched. Two
 * round trips for a page that renders neither without the other would be two chances for one of
 * them to be stale against the other.
 *
 * `categories` is every category the shop has and never the ones the current filter left standing:
 * navigation that empties as it is used is navigation a visitor cannot get back out of.
 */
export interface StorefrontCatalog {
  categories: PublicProductCategory[];
  /** One page of the match, in the shopkeeper's order — not the whole catalogue. */
  products: PublicProductCard[];
  /**
   * How many products the filter matched altogether, which is what the pager divides and what the
   * results line reads. It is never `products.length`: a last page of six of four hundred would
   * otherwise report four hundred as six and offer no page after it.
   */
  total: number;
  /** 1-based, as the URL spells it — there is no page zero to link to. */
  page: number;
  /**
   * How many one page holds. The answer states it rather than the caller assuming it, because a
   * request above the ceiling is served at the ceiling instead of refused.
   */
  pageSize: number;
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
  /**
   * The category this one goes under. Null, or absent, makes it a top level.
   *
   * The API refuses a parent that already has one: two levels, because the URL is
   * `/<shop>/<category>` flat and a grandchild has nowhere to live its grandparent does not
   * already occupy. It also refuses a category becoming its own parent.
   */
  parentId?: string | null;
  /** Null keeps it off the landing page. Set, it becomes a banner of that shape there. */
  showcaseLayout?: ShowcaseLayout | null;
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
  | "CATALOG_REORDER_MISMATCH"
  /** The parent asked for already has one, or is the category itself. Two levels, no third. */
  | "PRODUCT_CATEGORY_DEPTH";
