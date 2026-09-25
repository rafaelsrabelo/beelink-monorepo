// Types
import type { ComponentDisplay, ComponentKind, ComponentSpan, TextAlign } from "@harness-monorepo/contracts"

// UI
import { defaultAlignOf } from "@harness-monorepo/ui/blocks/design/text-align"

/** A block's layout as the page draws it, every null resolved to what the kind does with one. */
export interface DrawnLayout {
  span: ComponentSpan
  /** Null on a kind that lays nothing out: a heading, a paragraph, the strip. */
  display: ComponentDisplay | null
  /** `0` is "let the grid decide". */
  columns: number
  align: TextAlign
}

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

export function layoutOf(block: HeldLayout): DrawnLayout {
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
