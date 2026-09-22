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
  'COVER',
  'BANNER',
  'TEXT',
  'BENEFITS',
  'PRODUCTS',
] as const satisfies readonly SectionKind[];

/** Edge to edge, or inside the page's measure. Read only on a COVER. */
export const SECTION_WIDTHS = ['FULL', 'CONTAINED'] as const satisfies readonly SectionWidth[];

/**
 * The kinds a shop may have exactly one of.
 *
 * Two runs of products is not an arrangement, it is a bug the shopkeeper meets on the live page;
 * two covers is a page with two tops. They are also the two the shopkeeper never creates and never
 * deletes — the migration made them, and design mode only ever hides or moves them.
 */
export const SINGLETON_SECTION_KINDS = ['COVER', 'PRODUCTS'] as const satisfies readonly SectionKind[];

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
