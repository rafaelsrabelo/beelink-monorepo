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
 * Whether a product is on sale or still being written. ACTIVE is visible in the shop's sales
 * channels; DRAFT is visible to nobody but its owner.
 *
 * It is not stock. A shop selling made to order counts nothing and is still on sale, and a shop
 * that has run out is on sale with none left — three states a single boolean could not tell apart.
 */
export type ProductStatus = "ACTIVE" | "DRAFT";

/**
 * Whether the shop makes the thing or buys it to resell — not who manufactured it. A name would be
 * free text, and free text is how `Nike`, `NIKE` and `nike` become three brands in one filter.
 */
export type ProductOrigin = "IN_HOUSE" | "RESALE";

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
  /**
   * The shelf is empty — the shop counts this product and has none left.
   *
   * It is on the page's shape and not on the card's because a card never carries one that is true:
   * the grid, the category and the search exclude a sold-out product entirely. The page is the
   * exception, and deliberately so — its address is what goes out on WhatsApp, so it keeps
   * answering and drops the way to order instead of the page.
   *
   * Derived, never the count. How many a shop has left is its own business, and a number on the
   * public wire is one anybody can read off the page every morning.
   */
  soldOut: boolean;
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


/**
 * What a carrier measures, in whole millimetres and grams. All four together or none: a quote
 * cannot be asked for with a weight and no box, and a partial set is the shape most likely to
 * reach a shipping API and be refused there instead of here.
 */
export interface ProductParcel {
  weightGrams: number | null;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
}

/** What the shop counts, and whether it counts at all. */
export interface ProductStock {
  /**
   * Off by default. Most shops here sell made to order, and a count of zero on a product nobody
   * counts would take it out of the shop window for no reason.
   */
  trackStock: boolean;
  /**
   * Read only while `trackStock` — and that flag, not this column, is what says "nobody counts
   * this". On a counted product null and zero mean the same thing: a shopkeeper who turned
   * counting on and has not said how many, which from the shelf is none. Both take the product off
   * the shelf; see `soldOut`.
   */
  stockQuantity: number | null;
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
export interface Product extends PublicProduct, ProductStock, ProductParcel {
  position: number;
  /**
   * What the shopkeeper intends, and only half of what a visitor sees — the other half is stock.
   * A draft is visible to nobody but its owner; an active product is in the window unless its
   * shelf is empty. See `soldOut`.
   */
  status: ProductStatus;
  /** Null is a shopkeeper who has not said, never a third kind of product. */
  origin: ProductOrigin | null;
  /**
   * Whole cents, and owner-only — it is deliberately absent from `PublicProduct`. What a shop paid
   * is nobody's business but theirs, and a field on the public shape is a field in Google's index.
   */
  costCents: number | null;
  /**
   * The shopkeeper's own code, unique within the shop. On a product with options it is the first
   * variant's; each variant carries its own.
   */
  sku: string | null;
  /** A string, not a number — a leading zero on an EAN is part of it. */
  barcode: string | null;
  /** ISO-8601. */
  createdAt: string;
  /** ISO-8601. */
  updatedAt: string;
}

/**
 * How the panel's product list is narrowed. Every field is optional, and an absent one means "all"
 * — so an empty query is the whole catalogue, which is what the screen opens with.
 *
 * It is answered by the server and not filtered in the browser for the same reason the storefront's
 * catalogue is: a shop with three hundred products would otherwise ship all three hundred to draw
 * twenty. It also means a filtered list has an address, so the shopkeeper can return to it.
 */
export interface ProductListQuery {
  /** Matched against the name, the SKU and the barcode — the three things a shopkeeper types. */
  search?: string;
  status?: ProductStatus;
  categoryId?: string;
  origin?: ProductOrigin;
  stock?: ProductStockFilter;
  /** 1-based. Below the first page is served as the first page rather than refused. */
  page?: number;
  pageSize?: number;
}

/**
 * The three answers to "how many are left", which are not one number.
 *
 * `UNTRACKED` is a shop that does not count this product at all — made to order — and it is not a
 * stock of zero. Collapsing the two is what sends a shopkeeper looking for a stock problem that
 * does not exist.
 */
export type ProductStockFilter = "IN_STOCK" | "OUT_OF_STOCK" | "UNTRACKED";

/** One page of the panel's list, and what it is a page of. `total` counts the filter, not the page. */
export interface ProductPage {
  products: Product[];
  total: number;
  page: number;
  pageSize: number;
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
  costCents?: number | null;
  categoryId?: string | null;
  status?: ProductStatus;
  origin?: ProductOrigin | null;
  sku?: string | null;
  barcode?: string | null;
  trackStock?: boolean;
  stockQuantity?: number | null;
  weightGrams?: number | null;
  lengthMm?: number | null;
  widthMm?: number | null;
  heightMm?: number | null;
  /** Ordered as sent; the first becomes the card's image. */
  images?: ProductImagePayload[];
}

export type UpdateProductPayload = Partial<CreateProductPayload>;

export interface ProductImagePayload {
  url: string;
  alt?: string | null;
}

/* ── options and variants ───────────────────────────────────────────────── */

/** One answer to an option — P, Areia, Frutas vermelhas. */
export interface ProductOptionValue {
  id: string;
  name: string;
  /**
   * A colour option's swatch, `#rrggbb`. It is the shopkeeper's data, applied at runtime the way a
   * shop's brand colour is. Null on every value of an option that is not a colour.
   */
  colorHex: string | null;
}

/** A choice made before ordering — Tamanho, Cor. At most three per product, values in order. */
export interface ProductOption {
  id: string;
  name: string;
  values: ProductOptionValue[];
}

/**
 * One thing that can be ordered: one value of each option. A product with no options has exactly
 * one, with no values — its default variant.
 */
export interface ProductVariant extends ProductStock, ProductParcel {
  id: string;
  /** One value id per option, in the options' order. Empty on the default variant. */
  optionValueIds: string[];
  /** Off is "não vendo esta": a combination the shop does not sell, not one that sold out. */
  isActive: boolean;
  priceCents: number;
  compareAtPriceCents: number | null;
  /** Owner-only, like the product's. */
  costCents: number | null;
  /** Unique within the shop. */
  sku: string | null;
  barcode: string | null;
  /** This combination's photo, when it has one of its own. */
  imageUrl: string | null;
}

/**
 * One product with everything its editor needs. A product's own per-unit fields are, from here on,
 * a summary of its variants: the cheapest price on sale, the stock summed, the first variant's
 * codes and box.
 */
export interface ProductDetail extends Product {
  options: ProductOption[];
  /** In the order of the combinations: the first option changes slowest. */
  variants: ProductVariant[];
}

/** A value as the editor sends it. With an `id` it is that value, renamed; without, a new one. */
export interface ProductOptionValuePayload {
  id?: string;
  name: string;
  colorHex?: string | null;
}

/** An option as the editor sends it. With an `id` it is that option; without, a new one. */
export interface ProductOptionPayload {
  id?: string;
  name: string;
  /** At least one, in the order the shopkeeper arranged them. */
  values: ProductOptionValuePayload[];
}

/**
 * The product's options, whole and in order. What is left out is removed.
 *
 * A combination that still exists keeps its variant, with its price, stock and code. A new option
 * extends every variant with its first value. A combination nobody had before is created with the
 * price of the variant closest to it. A variant whose combination no longer exists is archived,
 * never deleted, so an order that named it keeps something to point at.
 */
export interface ReplaceProductOptionsPayload {
  options: ProductOptionPayload[];
}

/** One variant's changes. Only what is sent changes. */
export interface ProductVariantPayload extends Partial<ProductStock & ProductParcel> {
  id: string;
  isActive?: boolean;
  priceCents?: number;
  compareAtPriceCents?: number | null;
  costCents?: number | null;
  sku?: string | null;
  barcode?: string | null;
  imageUrl?: string | null;
}

/** Several variants of one product at once. Variants not listed are left as they are. */
export interface UpdateProductVariantsPayload {
  variants: ProductVariantPayload[];
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
  | "CATALOG_PARCEL_INCOMPLETE"
  | "CATALOG_REORDER_MISMATCH"
  /** The parent asked for already has one, or is the category itself. Two levels, no third. */
  | "PRODUCT_CATEGORY_DEPTH"
  /** Another product of the same shop already uses the code. */
  | "PRODUCT_SKU_TAKEN"
  /** A price or stock sent for a whole product that has options: those belong to its variants. */
  | "PRODUCT_HAS_OPTIONS"
  /** An option or value id that is not one of this product's. */
  | "PRODUCT_OPTION_NOT_FOUND"
  /** Two options with one name, or two values with one name in one option. */
  | "PRODUCT_OPTION_DUPLICATE"
  /** The options would make more combinations than a product may have. */
  | "PRODUCT_VARIANTS_LIMIT"
  /** A variant id that is not one of this product's current variants. */
  | "PRODUCT_VARIANT_NOT_FOUND";
