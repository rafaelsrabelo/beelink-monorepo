// Types
import type { ComponentKind, ComponentTarget, SectionWidth, ShowcaseLayout, TextAlign } from '@harness-monorepo/contracts';

/**
 * The shapes a banner may take inside its band. Spelled out rather than derived, like every other
 * enum the wire carries: a reader has to be able to see the whole list.
 */
export const SHOWCASE_LAYOUTS = ['FULL', 'HALVES', 'THIRDS'] as const satisfies readonly ShowcaseLayout[];

/** Every kind of thing a band may hold. */
export const COMPONENT_KINDS = [
  'ANNOUNCEMENT',
  'BANNER',
  'HEADING',
  'TEXT',
  'BENEFITS',
  'CATEGORIES',
  'PRODUCTS',
] as const satisfies readonly ComponentKind[];

/** Where a heading or a paragraph sits. Null on the wire is "as the kind always drew it". */
export const TEXT_ALIGNS = ['LEFT', 'CENTER', 'RIGHT'] as const satisfies readonly TextAlign[];

/** Edge to edge, or inside the page's measure. An attribute of the band, never of what is in it. */
export const SECTION_WIDTHS = ['FULL', 'CONTAINED'] as const satisfies readonly SectionWidth[];

/**
 * The kinds a shop may have exactly one of, anywhere on the page.
 *
 * Two runs of products is not an arrangement, it is a bug the shopkeeper meets on the live page
 * with no row left to put the shelves back. The strip above the header is one because there is one
 * masthead.
 *
 * A banner is NOT on this list, and that is the whole of what changed: it was here while `HERO`
 * existed, because "the one at the top" could only be one. A cover is the first band now, so a
 * shop may have as many banners as it has places to put them.
 */
export const SINGLETON_COMPONENT_KINDS = ['ANNOUNCEMENT', 'PRODUCTS'] as const satisfies readonly ComponentKind[];

/**
 * The kinds a shop cannot be without, at either level: the component may not be deleted, and
 * neither may the section holding it. Hiding is what exists for "not now".
 *
 * A landing page without what the shop sells is not an arrangement anyone wants, and a shop
 * reached it: the component's row drew no bin, the section's bin did not ask what was inside, and
 * the menu had no way to put the shelves back. Three products existed and none appeared.
 */
export const REQUIRED_COMPONENT_KINDS = ['PRODUCTS'] as const satisfies readonly ComponentKind[];

/**
 * Where a slide may point. See `ComponentTarget` for why two of the four carry an id.
 *
 * `satisfies readonly ComponentTarget[]` does not catch a missing value — a subset satisfies it
 * just as well — so this list is the one place where forgetting one is silent.
 */
export const COMPONENT_TARGETS = [
  'CATEGORY',
  'PRODUCT',
  'EXTERNAL',
  'NONE',
] as const satisfies readonly ComponentTarget[];

export const COMPONENT_TITLE_MAX_LENGTH = 120;
export const COMPONENT_SUBTITLE_MAX_LENGTH = 200;

/** A paragraph, bounded. Long enough for an "about us"; short of an essay pasted into a shop. */
export const COMPONENT_BODY_MAX_LENGTH = 2000;

/** How many cards a grid may draw across. Two to six — one is a list, and seven are stamps. */
export const COMPONENT_MIN_COLUMNS = 2;
export const COMPONENT_MAX_COLUMNS = 6;

/**
 * A bound on the external address, named rather than inherited.
 *
 * `@IsUrl` without one silently takes validator.js's `max_allowed_length` of 2084, which is an
 * accident rather than a decision. Two thousand and forty-eight is what the layout schema already
 * bounds its stored image URLs at, and for the same stated reason: this value is echoed verbatim
 * into an anchor on the anonymous, indexed shop window.
 */
export const COMPONENT_URL_MAX_LENGTH = 2048;

/** A colour as the panel sends it: `#RGB`, `#RRGGBB` or `#RRGGBBAA`, which is what VarChar(9) holds. */
export const HEX_COLOUR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
