/**
 * The shapes the `design` blocks render.
 *
 * They mirror `@harness-monorepo/contracts` field for field and are restated here on purpose: this
 * package declares no dependency on the wire types, so a block renders in Storybook with nothing
 * behind it — the same reason `store/store-types.ts` restates the shop. Because the shapes are
 * structural, a screen hands a `StoreComponent` from the contract straight in.
 */

/**
 * Every kind of thing a band may hold. The contract's `ComponentKind`, restated.
 *
 * There is no `HERO`: a cover is the first band, full width, with a banner in it. A position
 * turned into a type is what that value was, and removing it is what this level bought.
 */
export const COMPONENT_KINDS = [
  "ANNOUNCEMENT",
  "BANNER",
  "HEADING",
  "TEXT",
  "BENEFITS",
  "CATEGORIES",
  "PRODUCTS",
  "CONTACT",
  "FAQ",
  "CALL_TO_ACTION",
  "IMAGE_TEXT",
  "FEATURED_PRODUCT",
  "COUNTDOWN",
] as const
export type ComponentKind = (typeof COMPONENT_KINDS)[number]

/**
 * How many banners the gallery puts in one row: a whole one, two halves or three thirds.
 *
 * A row is a band — blocks share a row only inside one band's grid (`StorefrontBandGrid`) — so a
 * row of two or three is offered only where a band is created, never from a band's own "+".
 */
export const ACROSS = [1, 2, 3] as const
export type Across = (typeof ACROSS)[number]

/** What one field of a contact form may ask for. The contract's `ContactFieldType`, restated. */
export const CONTACT_FIELD_TYPES = ["TEXT", "EMAIL", "PHONE", "TEXTAREA", "SELECT", "DATE"] as const
export type ContactFieldType = (typeof CONTACT_FIELD_TYPES)[number]

/**
 * A block's layout. The contract's `ComponentDisplay`, restated; which kind draws which is
 * `SECTION_TYPES` (lib/section-registry.ts), and every other kind holds null.
 */
export const COMPONENT_DISPLAYS = [
  "CAROUSEL",
  "GRID",
  "RAIL",
  "BACKDROP",
  "SPLIT",
  "CHIPS",
  "INLINE",
  "CARDS",
  "STATIC",
  "MARQUEE",
  "ACCORDION",
  "BAND",
  "CARD",
  "IMAGE_LEFT",
  "IMAGE_RIGHT",
  "IMAGE_LARGE",
  "BLOCK",
] as const
export type ComponentDisplay = (typeof COMPONENT_DISPLAYS)[number]

/** Where a block shows. The contract's `DeviceVisibility`, restated: the shop's `md` width, 768px, divides the two. */
export const DEVICE_VISIBILITIES = ["ALL", "DESKTOP", "PHONE"] as const
export type DeviceVisibility = (typeof DEVICE_VISIBILITIES)[number]

/**
 * Which products a showcase draws. The contract's `ProductSource`, restated, in the order the editor
 * offers them: everything first, then a slice of it.
 */
export const PRODUCT_SOURCES = ["ALL", "CATEGORY", "SELECTION", "NEWEST", "ON_SALE"] as const
export type ProductSource = (typeof PRODUCT_SOURCES)[number]

/** Edge to edge, or inside the shop's measure. An attribute of the band, never of what is in it. */
export const SECTION_WIDTHS = ["FULL", "CONTAINED"] as const
export type SectionWidth = (typeof SECTION_WIDTHS)[number]

// Kept next to the other restated shapes, defined in `text-align.tsx` — see there for why that
// file is what it is.
export { TEXT_ALIGNS, defaultAlignOf } from "./text-align"
export type { TextAlign } from "./text-align"

/** What Publicar may warn about. The contract's `PageProblemKind`, restated. */
export type DesignPublishProblemKind =
  | "LINK_TO_MISSING_PRODUCT"
  | "LINK_TO_MISSING_CATEGORY"
  | "SHOWCASE_EMPTY"
  | "BANNER_WITHOUT_IMAGE"
  | "FEATURED_PRODUCT_UNAVAILABLE"
  | "COUNTDOWN_ENDED"
