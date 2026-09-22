// Types
import type { RouteVocabulary, ShowcaseLayout, StorefrontRouteWords } from '@harness-monorepo/contracts';

/**
 * Which words each vocabulary builds a shop's URLs from. The table is the only place these strings
 * exist: the web receives them as `routeWords` on the shop, so no component anywhere holds the
 * literal "produtos", and changing a shop's vocabulary changes every link it renders at once.
 */
export const ROUTE_WORDS = {
  PT_BR: { products: 'produtos', categories: 'categorias', search: 'busca', cart: 'carrinho' },
  EN: { products: 'products', categories: 'categories', search: 'search', cart: 'cart' },
} as const satisfies Record<RouteVocabulary, StorefrontRouteWords>;

export const ROUTE_VOCABULARIES = ['PT_BR', 'EN'] as const satisfies readonly RouteVocabulary[];

/**
 * The segments a category may never take, and the reason the second part of a storefront URL can be
 * resolved at all.
 *
 * `/<shop>/<segment>` is a category **unless** the segment is a word the router already means
 * something by, so a category slugged `produtos` would be unreachable: the resolver reads the
 * segment as a route word before it looks for a category. Refusing it on the way in is the only
 * point at which that is a message a shopkeeper can act on rather than a page that silently 404s.
 *
 * It holds the words of **every** vocabulary, not just the shop's current one. That is what makes
 * `Store.routeVocabulary` safe to change: switching a shop from PT_BR to EN can never collide with
 * a category it already has, because `products` was refused on the day the shop was still PT_BR.
 *
 * The rest are segments the storefront will grow — the cart, the checkout, search, contact. They
 * are reserved now, while it costs nothing, rather than the day one of them ships and a shop
 * somewhere already has a category called `contato`. The legacy checked none of this.
 */
export const RESERVED_PATH_SEGMENTS: readonly string[] = [
  // Every value of ROUTE_WORDS, spelled out rather than derived: a reader has to be able to see the
  // whole list, and a derived list would silently shrink if a vocabulary were ever removed. A word
  // added to ROUTE_WORDS and not to this list is a category a shop can take today and lose tomorrow.
  'produtos',
  'products',
  'categorias',
  'categories',
  'busca',
  'search',
  // Reserved for the storefront's own routes, in both languages.
  'carrinho',
  'cart',
  'checkout',
  'conta',
  'account',
  'contato',
  'contact',
  'entrar',
  'login',
  'pedido',
  'pedidos',
  'order',
  'orders',
  'sobre',
  'about',
  // The shop window's own assets, which Next serves from paths of this shape.
  'api',
  'sitemap.xml',
  'robots.txt',
];

/** Lower case, `a-z0-9`, single hyphens, no hyphen at either end — the same shape a shop slug has. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const CATEGORY_SLUG_MAX_LENGTH = 80;
export const PRODUCT_SLUG_MAX_LENGTH = 120;
export const CATEGORY_NAME_MAX_LENGTH = 120;
export const PRODUCT_NAME_MAX_LENGTH = 160;
export const DESCRIPTION_MAX_LENGTH = 2000;
export const IMAGE_ALT_MAX_LENGTH = 200;

/**
 * How many past slugs one row keeps. Every entry is a redirect that must keep working, and the
 * lookup is `{ has: … }` over the array, so the bound is what stops a shopkeeper who renames a
 * product every day from turning one index scan into an unbounded one. Ten covers real editing;
 * the eleventh rename retires the oldest link, which by then nobody holds.
 */
export const SLUG_HISTORY_LIMIT = 10;

/** A product grid on the storefront, and the page size the panel's list asks for. */
export const PRODUCTS_PAGE_SIZE = 24;

/**
 * The most one request may be served, however large a page it asks for. The page size reaches this
 * API as a number in a public URL, so without a ceiling one address could ask a shop of ten
 * thousand products for all of them — and be answered, as often as it asked.
 */
export const PRODUCTS_PAGE_SIZE_MAX = 96;

/**
 * The ceiling on one product's photos. The panel uploads them one at a time through
 * `modules/uploads`; this only bounds how many URLs one write may carry.
 */
export const PRODUCT_IMAGES_MAX = 10;

/** Cents. A product priced above this is a typo — R$ 1.000.000,00 — not a sale. */
export const PRICE_CENTS_MAX = 100_000_000;

/**
 * The shapes a category may take on the landing page. Spelled out rather than derived, like every
 * other enum the wire carries: a reader has to be able to see the whole list.
 */
export const SHOWCASE_LAYOUTS = ['FULL', 'HALVES', 'THIRDS'] as const satisfies readonly ShowcaseLayout[];

/** Grams. Thirty kilos is past what a carrier takes as a parcel; beyond it is a typo. */
export const PARCEL_GRAMS_MAX = 30_000;

/** Millimetres. Two metres on a side is past any parcel service. */
export const PARCEL_MM_MAX = 2_000;

/** A count this high is a typo, not a warehouse. */
export const STOCK_MAX = 1_000_000;
