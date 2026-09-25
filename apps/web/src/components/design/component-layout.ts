// Types
import type { ComponentDisplay, ComponentKind, ComponentSpan, TextAlign } from "@harness-monorepo/contracts"

// UI
import type { ComponentLayoutValues } from "@harness-monorepo/ui/blocks/design/component-layout-fields"
import { defaultAlignOf } from "@harness-monorepo/ui/blocks/design/text-align"

/** The layout fields a block holds on the wire, or in the draft. */
export interface HeldLayout {
  kind: ComponentKind
  span: ComponentSpan
  display: ComponentDisplay | null
  columns: number | null
  align: TextAlign | null
}

/**
 * The format a block draws, where its kind has one: the kind's own when none was chosen. Each
 * branch is the storefront's own test — a banner is a carousel unless it says grid, the categories
 * a grid unless they say rail, a showcase a rail unless it says grid.
 */
export function displayOf(kind: ComponentKind, display: ComponentDisplay | null): ComponentDisplay | null {
  if (kind === "CATEGORIES") return display === "RAIL" ? "RAIL" : "GRID"
  if (kind === "PRODUCTS") return display === "GRID" ? "GRID" : "RAIL"
  if (kind === "BANNER") return display === "GRID" ? "GRID" : "CAROUSEL"

  return null
}

/** A block's layout as the page draws it — what the Layout tab shows — every null resolved. */
export function layoutOf(block: HeldLayout): ComponentLayoutValues {
  return {
    span: block.span,
    display: displayOf(block.kind, block.display),
    columns: block.columns ?? 0,
    align: block.align ?? defaultAlignOf(block.kind),
  }
}

/**
 * Whether two holdings draw the same. Compared as drawn and not as held: a heading saved with no
 * alignment is centred, so choosing "esquerda" and then "centro" again is no change to publish.
 */
export function sameLayout(a: HeldLayout, b: HeldLayout): boolean {
  const [x, y] = [layoutOf(a), layoutOf(b)]

  return x.span === y.span && x.display === y.display && x.columns === y.columns && x.align === y.align
}

/** A change from the Layout tab, as the draft holds it: "automático" is null on the wire. */
export function heldLayoutOf(next: Partial<ComponentLayoutValues>): Partial<Omit<HeldLayout, "kind">> {
  const { columns, ...rest } = next

  return { ...rest, ...(columns === undefined ? {} : { columns: columns || null }) }
}
