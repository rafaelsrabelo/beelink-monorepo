// Types
import type { SectionKind, SectionTarget, SectionWidth, ShowcaseLayout } from '@harness-monorepo/contracts';

/**
 * The shapes a banner may take on the landing page. Spelled out rather than derived, like every
 * other enum the wire carries: a reader has to be able to see the whole list.
 */
export const SHOWCASE_LAYOUTS = ['FULL', 'HALVES', 'THIRDS'] as const satisfies readonly ShowcaseLayout[];

/**
 * Every kind of block a landing page is made of. Spelled out for the same reason as the rest: a
 * reader has to be able to see the whole list without opening the contract.
 */
export const SECTION_KINDS = [
  'ANNOUNCEMENT',
  'HERO',
  'BANNER',
  'TEXT',
  'BENEFITS',
  'CATEGORIES',
  'PRODUCTS',
] as const satisfies readonly SectionKind[];

/** Edge to edge, or inside the page's measure. Read only on a COVER. */
export const SECTION_WIDTHS = ['FULL', 'CONTAINED'] as const satisfies readonly SectionWidth[];

/**
 * The kinds a shop may have exactly one of.
 *
 * Two runs of products is not an arrangement, it is a bug the shopkeeper meets on the live page,
 * and two heroes is a page with two tops. A hero was briefly not on this list, back when each one
 * was its own row and two adjacent rows drew a carousel — the shopkeeper tried that and it was
 * confusing both to make and to read. A carousel is one hero holding several pictures now, so
 * adding a top banner adds a picture to the one that exists.
 */
export const SINGLETON_SECTION_KINDS = ['ANNOUNCEMENT', 'HERO', 'PRODUCTS'] as const satisfies readonly SectionKind[];

/**
 * The two kinds that are the same block in two places.
 *
 * A banner at the top and a banner in the body hold identical fields — a picture, a title, a
 * destination — so moving one between them is a patch, and the panel asks it in exactly those
 * words: "onde aparece". Every other kind is a different shape, and a PRODUCTS row patched into a
 * BANNER would take the shop's shelves off its landing page without saying so.
 */
export const PLACEMENT_SECTION_KINDS = ['HERO', 'BANNER'] as const satisfies readonly SectionKind[];

/**
 * Where a banner may point. See the SectionTarget enum for why two of the four are foreign keys.
 *
 * `satisfies readonly SectionTarget[]` does not catch a missing value — a subset satisfies it just
 * as well — so this list is the one place where forgetting one is silent. What it would break is
 * `@IsIn`, which would then refuse a target the database accepts.
 */
export const SECTION_TARGETS = [
  'CATEGORY',
  'PRODUCT',
  'EXTERNAL',
  'NONE',
] as const satisfies readonly SectionTarget[];

export const SECTION_TITLE_MAX_LENGTH = 120;
export const SECTION_SUBTITLE_MAX_LENGTH = 200;

/**
 * A bound on the external address, named rather than inherited.
 *
 * `@IsUrl` without one silently takes validator.js's `max_allowed_length` of 2084, which is an
 * accident rather than a decision. Two thousand and forty-eight is what the layout schema already
 * bounds its stored image URLs at, and for the same stated reason: this value is echoed verbatim
 * into an anchor on the anonymous, indexed shop window.
 */
export const SECTION_URL_MAX_LENGTH = 2048;
