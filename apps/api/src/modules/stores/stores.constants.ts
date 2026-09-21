// Types
import type { PaymentMethod, ShowcaseLayout, StoreLayoutType, StoreType } from '@harness-monorepo/contracts';

/**
 * The slugs a shop may never take. `/<slug>` is a catch-all sibling of the web app's own top-level
 * segments, so a shop on `admin` would shadow the panel and one on `login` would shadow sign-in.
 * The legacy checked none of them. `mine` is here because `GET /stores/mine` is declared above
 * `GET /stores/:slug`, so a shop called `mine` could never be reached through its own route.
 *
 * Kept lower case and already normalised, like every stored slug, so the lookup is a plain compare.
 */
export const RESERVED_SLUGS: readonly string[] = [
  'admin',
  'api',
  'auth',
  'cart',
  'checkout',
  'create',
  'create-store',
  'dashboard',
  'docs',
  'forgot-password',
  'login',
  'logout',
  'mine',
  'orders',
  'public',
  'reset-password',
  'settings',
  'signup',
  'store',
  'stores',
  'verify-email',
];

/** The closed unions, as values the validators can range over. Checked against the contract. */
export const STORE_TYPES = ['ECOMMERCE'] as const satisfies readonly StoreType[];
export const STORE_LAYOUT_TYPES = ['DEFAULT', 'BANNER'] as const satisfies readonly StoreLayoutType[];
export const PAYMENT_METHODS = [
  'MONEY',
  'PIX',
  'CREDIT_CARD',
  'DEBIT_CARD',
] as const satisfies readonly PaymentMethod[];

/** `#RRGGBB`, the one form the contract allows — not the 3- or 8-digit shorthands. */
export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

/** Lower case, `a-z0-9`, single hyphens, no hyphen at either end. */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 40;

/**
 * The one bound on a shop's description, stated on `PublicStore.description` in the contract and
 * enforced here. The column is unbounded `text`: this number exists so a storefront page and an
 * update body have a ceiling, not because the database needs one — which is why raising it is a
 * one-line change and needs no migration.
 */
export const DESCRIPTION_MAX_LENGTH = 2000;

/**
 * The storefront read is the one anonymous route in this module. It is a decision, not configuration:
 * every browser reaches it through the web app's Server Component, so the limit sees one address for
 * the whole storefront — the real cache is that read's 60-second `revalidate`, and this only stops a
 * crawler that bypasses it.
 */
export const STOREFRONT_RATE_LIMIT = { max: 300, timeWindow: '1 minute' };

// The limit on the two writes is deliberately not in this file: it reads `env`, and this file is
// imported by the DTOs and by their unit tests, which must load without a `.env`. It is built in
// stores.controller.ts, beside the routes it guards, exactly as auth.controller.ts builds its own.

/** The shapes a landing-page block may take. Spelled out, like every other enum the wire carries. */
export const SHOWCASE_LAYOUTS = ['THIRDS', 'HALVES'] as const satisfies readonly ShowcaseLayout[];
