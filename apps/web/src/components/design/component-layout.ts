// Types
import type { ComponentDisplay, ComponentKind, ComponentSpan, DeviceVisibility, TextAlign } from "@harness-monorepo/contracts"

// UI
import type { ComponentLayoutValues } from "@harness-monorepo/ui/blocks/design/component-layout-fields"
import { defaultAlignOf } from "@harness-monorepo/ui/blocks/design/text-align"
import { layoutsOf } from "@harness-monorepo/ui/lib/section-registry"

/** The layout fields a block holds on the wire, or in the draft. */
export interface HeldLayout {
  kind: ComponentKind
  span: ComponentSpan
  display: ComponentDisplay | null
  columns: number | null
  align: TextAlign | null
  visibleOn: DeviceVisibility
}

/**
 * The layout a block draws, where its kind has any: the one chosen, else the look the kind had before
 * there was a choice — the storefront's own reading of an unset value.
 *
 * Null for a strip with none: it draws a way no option does, still where it fits and scrolling on a
 * phone, so it is shown as none chosen, and choosing "Fixa" for it is a change Publicar sends.
 */
export function displayOf(kind: ComponentKind, display: ComponentDisplay | null): ComponentDisplay | null {
  const own = layoutsOf(kind)
  if (!own) return null
  if (display && own.includes(display)) return display
  // A kind born with its layouts opens with one, so unset is a row from before it had them: its first.
  if (own.length === 1) return own[0]!
  // Unset, each kind's habit: the look it had before there was a choice.
  if (kind === "CATEGORIES") return "GRID"
  if (kind === "PRODUCTS") return "RAIL"
  if (kind === "BANNER") return "CAROUSEL"
  if (kind === "BENEFITS") return "INLINE"
  return null
}

/** A block's layout as the page draws it — what the Layout tab shows — every null resolved. */
export function layoutOf(block: HeldLayout): ComponentLayoutValues {
  return {
    span: block.span,
    display: displayOf(block.kind, block.display),
    columns: block.columns ?? 0,
    align: block.align ?? defaultAlignOf(block.kind),
    visibleOn: block.visibleOn,
  }
}

/**
 * Whether two holdings draw the same. Compared as drawn and not as held: a heading saved with no
 * alignment is centred, so choosing "esquerda" and then "centro" again is no change to publish.
 */
export function sameLayout(a: HeldLayout, b: HeldLayout): boolean {
  const [x, y] = [layoutOf(a), layoutOf(b)]

  return (
    x.span === y.span &&
    x.display === y.display &&
    x.columns === y.columns &&
    x.align === y.align &&
    x.visibleOn === y.visibleOn
  )
}

/** A change from the Layout tab, as the draft holds it: "automático" is null on the wire. */
export function heldLayoutOf(next: Partial<ComponentLayoutValues>): Partial<Omit<HeldLayout, "kind">> {
  const { columns, ...rest } = next

  return { ...rest, ...(columns === undefined ? {} : { columns: columns || null }) }
}
