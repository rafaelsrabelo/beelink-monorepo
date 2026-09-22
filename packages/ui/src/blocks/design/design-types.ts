/**
 * The shapes the `design` blocks render.
 *
 * They mirror `@harness-monorepo/contracts` field for field and are restated here on purpose: this
 * package declares no dependency on the wire types, so a block renders in Storybook with nothing
 * behind it — the same reason `store/store-types.ts` restates the shop. Because the shapes are
 * structural, a screen hands a `Section` from the contract straight in.
 */

/** Every kind of block a landing page is made of. The contract's `SectionKind`, restated. */
export const SECTION_KINDS = [
  "ANNOUNCEMENT",
  "HERO",
  "BANNER",
  "TEXT",
  "BENEFITS",
  "CATEGORIES",
  "PRODUCTS",
] as const
export type SectionKind = (typeof SECTION_KINDS)[number]

/** Edge to edge, or inside the shop's measure. Read only on a cover. */
export const SECTION_WIDTHS = ["FULL", "CONTAINED"] as const
export type SectionWidth = (typeof SECTION_WIDTHS)[number]
