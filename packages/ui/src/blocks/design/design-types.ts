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
] as const
export type ComponentKind = (typeof COMPONENT_KINDS)[number]

/** What one field of a contact form may ask for. The contract's `ContactFieldType`, restated. */
export const CONTACT_FIELD_TYPES = ["TEXT", "EMAIL", "PHONE", "TEXTAREA", "SELECT", "DATE"] as const
export type ContactFieldType = (typeof CONTACT_FIELD_TYPES)[number]

/** Edge to edge, or inside the shop's measure. An attribute of the band, never of what is in it. */
export const SECTION_WIDTHS = ["FULL", "CONTAINED"] as const
export type SectionWidth = (typeof SECTION_WIDTHS)[number]

// Kept next to the other restated shapes, defined in `text-align.tsx` — see there for why that
// file is what it is.
export { TEXT_ALIGNS, defaultAlignOf } from "./text-align"
export type { TextAlign } from "./text-align"
