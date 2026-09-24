// Types
import type { ComponentKind } from "@harness-monorepo/contracts"

/** Why a block draws nothing on the shop window, when the owner can do something about it. */
export type EmptyState =
  | { kind: "categoriesUnlinked"; count: number }
  | { kind: "categoriesNone" }
  | { kind: "productsNone" }
  | { kind: "sourceEmpty" }

export interface EmptyFacts {
  /** Categories the shop window shows — the public list, which leaves out a category with no product. */
  categoriesShown: number
  /** The shop's own active categories, shown or not. Null while they load. */
  categories: number | null
  /** The shop's products, on the shelf or not. Null while they load. */
  products: number | null
  /** The showcase's shelf, as the public read resolved it, came back empty. */
  shelfEmpty: boolean
}

/**
 * The cause of an empty block, from the counts design mode already holds — or null when the block
 * draws, or when what would say why has not arrived yet (a notice that flickers from "no
 * categories" to nothing is worse than none).
 *
 * A categories block draws nothing when no category is on the shop window: none exist, or none has
 * a product yet. A showcase draws nothing when the shop has no product, or when its source brings
 * none — the second is fixed in the showcase's own sheet.
 */
export function emptyStateOf(kind: ComponentKind, facts: EmptyFacts): EmptyState | null {
  if (kind === "CATEGORIES") {
    if (facts.categoriesShown > 0 || facts.categories === null) return null
    return facts.categories === 0 ? { kind: "categoriesNone" } : { kind: "categoriesUnlinked", count: facts.categories }
  }

  if (kind === "PRODUCTS") {
    if (facts.products === null) return null
    if (facts.products === 0) return { kind: "productsNone" }
    return facts.shelfEmpty ? { kind: "sourceEmpty" } : null
  }

  return null
}
