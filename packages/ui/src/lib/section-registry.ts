// Block
import type { ComponentDisplay, ComponentKind } from "../blocks/design/design-types"

/**
 * The gallery's shelves, by what a section does for the shop — so one gallery serves a store and a
 * site: a site has nothing to sell, and "Produtos e venda" is simply not drawn for it.
 */
export const SECTION_CATEGORIES = ["COVER", "SELLING", "TRUST", "CONTENT", "CONVERSION", "CHROME"] as const
export type SectionCategory = (typeof SECTION_CATEGORIES)[number]

/** What the editor knows about a kind of section, whatever the language: its name and line are the copy's. */
export interface SectionType {
  category: SectionCategory
  /** Also under Recomendadas: what a first page is usually built from. A filter, not a shelf of its own. */
  recommended: boolean
  /**
   * The formats it draws, in the order offered, or null where it lays nothing out. Mirrors the API's
   * `DISPLAYS_OF_KIND` (apps/api/src/modules/page/page.constants.ts): a format refused there is never offered.
   */
  layouts: readonly ComponentDisplay[] | null
  /** Offered as a row of two or three where a band is created. */
  rows: boolean
}

/**
 * Every kind of section, once. The gallery files and offers from it, and the Layout tab and the bar
 * read what each draws — three lists that used to be kept in step by hand. `satisfies` is what fails
 * the build when a kind is added and left out.
 */
export const SECTION_TYPES = {
  BANNER: { category: "COVER", recommended: true, layouts: ["BACKDROP", "SPLIT", "CAROUSEL", "GRID"], rows: true },
  PRODUCTS: { category: "SELLING", recommended: true, layouts: ["RAIL", "GRID"], rows: false },
  CATEGORIES: { category: "SELLING", recommended: true, layouts: ["RAIL", "GRID", "CHIPS"], rows: false },
  BENEFITS: { category: "TRUST", recommended: true, layouts: ["INLINE", "CARDS"], rows: false },
  HEADING: { category: "CONTENT", recommended: false, layouts: null, rows: false },
  TEXT: { category: "CONTENT", recommended: false, layouts: null, rows: false },
  CONTACT: { category: "CONVERSION", recommended: true, layouts: null, rows: false },
  FAQ: { category: "TRUST", recommended: false, layouts: ["ACCORDION"], rows: false },
  ANNOUNCEMENT: { category: "CHROME", recommended: false, layouts: ["STATIC", "MARQUEE"], rows: false },
} as const satisfies Record<ComponentKind, SectionType>

/** The formats a kind draws, where it has any. */
export function layoutsOf(kind: ComponentKind): readonly ComponentDisplay[] | undefined {
  return SECTION_TYPES[kind].layouts ?? undefined
}
