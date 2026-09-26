// Types
import type {
  ComponentDisplay,
  ComponentKind,
  ComponentSpan,
  ComponentTarget,
  ContactFieldType,
  DeviceVisibility,
  ProductSource,
  SectionWidth,
  TextAlign,
} from '@harness-monorepo/contracts';

/** A component's slice of its band. */
export const COMPONENT_SPANS = ['FULL', 'HALF', 'THIRD', 'TWO_THIRDS'] as const satisfies readonly ComponentSpan[];

/** Everywhere, only on a computer, only on a phone. */
export const DEVICE_VISIBILITIES = ['ALL', 'DESKTOP', 'PHONE'] as const satisfies readonly DeviceVisibility[];

/** Every layout any kind draws; `DISPLAYS_OF_KIND` says which are whose. */
export const COMPONENT_DISPLAYS = [
  'CAROUSEL',
  'GRID',
  'RAIL',
  'BACKDROP',
  'SPLIT',
  'CHIPS',
  'INLINE',
  'CARDS',
  'STATIC',
  'MARQUEE',
] as const satisfies readonly ComponentDisplay[];

/**
 * The displays each kind draws. A kind absent from this table holds null, and a write that sends
 * it a value is refused rather than stored for nobody; so is a value its kind does not draw — a
 * banner is not a rail, and a showcase is not a carousel.
 */
export const DISPLAYS_OF_KIND: Partial<Record<ComponentKind, readonly ComponentDisplay[]>> = {
  BANNER: ['BACKDROP', 'SPLIT', 'CAROUSEL', 'GRID'],
  PRODUCTS: ['RAIL', 'GRID'],
  CATEGORIES: ['RAIL', 'GRID', 'CHIPS'],
  BENEFITS: ['INLINE', 'CARDS'],
  ANNOUNCEMENT: ['STATIC', 'MARQUEE'],
};

/**
 * `DISPLAYS_OF_KIND` in words, for Swagger: "BANNER: BACKDROP, SPLIT, CAROUSEL or GRID; …". Built
 * from the table so a kind's new layout reaches the docs without anyone editing a sentence.
 */
export function displaysInWords(): string {
  return Object.entries(DISPLAYS_OF_KIND)
    .map(([kind, displays]) => `${kind}: ${displays.length > 1 ? `${displays.slice(0, -1).join(', ')} or ${displays.at(-1)}` : displays.join('')}`)
    .join('; ');
}

/** Which products a showcase draws. No best sellers: nothing records a sale yet. */
export const PRODUCT_SOURCES = ['ALL', 'CATEGORY', 'SELECTION', 'NEWEST', 'ON_SALE'] as const satisfies readonly ProductSource[];

/**
 * How many products a showcase draws, at most, and the default when it says nothing. The default is
 * what the one shelf of the landing page drew before a shop could have several; the ceiling is half
 * the catalogue's page, because a showcase is a cut of the catalogue, not the catalogue.
 */
export const SHOWCASE_LIMIT_MAX = 48;
export const SHOWCASE_LIMIT_DEFAULT = 24;

/** Every kind of thing a band may hold. */
export const COMPONENT_KINDS = [
  'ANNOUNCEMENT',
  'BANNER',
  'HEADING',
  'TEXT',
  'BENEFITS',
  'CATEGORIES',
  'PRODUCTS',
  'CONTACT',
] as const satisfies readonly ComponentKind[];

/**
 * What one field of a contact form may ask for. Six, and the list is the product decision: enough
 * for "empresa, produto, volume, origem, destino, data desejada" without becoming a form builder.
 */
export const CONTACT_FIELD_TYPES = [
  'TEXT',
  'EMAIL',
  'PHONE',
  'TEXTAREA',
  'SELECT',
  'DATE',
] as const satisfies readonly ContactFieldType[];

/** A form with more than this is a survey, and a survey is not what a landing page's contact is. */
export const CONTACT_FIELDS_MAX = 12;
export const CONTACT_FIELD_LABEL_MAX_LENGTH = 60;
export const CONTACT_OPTIONS_MAX = 20;
export const CONTACT_OPTION_MAX_LENGTH = 60;

/** Where a heading or a paragraph sits. Null on the wire is "as the kind always drew it". */
export const TEXT_ALIGNS = ['LEFT', 'CENTER', 'RIGHT'] as const satisfies readonly TextAlign[];

/** Edge to edge, or inside the page's measure. An attribute of the band, never of what is in it. */
export const SECTION_WIDTHS = ['FULL', 'CONTAINED'] as const satisfies readonly SectionWidth[];

/**
 * The kinds a shop may have exactly one of, anywhere on the page: the strip above the header, because
 * there is one masthead.
 *
 * The showcase was one too, while every showcase drew the same shelves — two of them were the same
 * products twice. Each has a source of its own now, and a shop may have as many as it has shelves.
 *
 * A banner is NOT on this list, and that is the whole of what changed: it was here while `HERO`
 * existed, because "the one at the top" could only be one. A cover is the first band now, so a
 * shop may have as many banners as it has places to put them.
 */
export const SINGLETON_COMPONENT_KINDS = ['ANNOUNCEMENT'] as const satisfies readonly ComponentKind[];

/**
 * The kinds that stay in their own band, and whose band takes nothing moved in: the strip above the
 * header. Its band is its colour, drawn above the masthead, and not a row anything can sit beside.
 */
export const UNMOVABLE_COMPONENT_KINDS = ['ANNOUNCEMENT'] as const satisfies readonly ComponentKind[];

/**
 * The kinds a shop cannot be without, at either level: the last one may not be deleted, and neither
 * may the section holding it. Hiding is what exists for "not now"; a second one can go.
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

export const SECTION_NAME_MAX_LENGTH = 60;
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
