// Types
import type { ComponentKind } from "@harness-monorepo/contracts"

/** Why a block draws nothing on the shop window, when the owner can do something about it. */
export type EmptyState =
  | { kind: "categoriesUnlinked"; count: number }
  | { kind: "categoriesNone" }
  | { kind: "categoriesHidden" }
  | { kind: "categoriesDrafts" }
  | { kind: "productsNone" }
  | { kind: "productsOffShelf" }
  | { kind: "sourceEmpty" }

export interface EmptyFacts {
  /** Categories the shop window shows — the public list, which leaves out a category with nothing published. */
  categoriesShown: number
  /** The shop's own categories, hidden ones included, each with what is filed in it. Null while they load. */
  categories: readonly { isActive: boolean; productCount: number }[] | null
  /**
   * The shop's products: all of them, and how many are on the shelf (published and in stock). The
   * second is null when it cannot be told from the page the panel loaded. Null while they load.
   */
  products: { total: number; onShelf: number | null } | null
  /** The showcase's shelf, as the public read resolved it, came back empty. */
  shelfEmpty: boolean
}

/**
 * The cause of an empty block, from the counts design mode holds — or null when the block draws,
 * or when what would say why has not arrived or cannot be told (a wrong cause is worse than none).
 *
 * A categories block draws nothing when no category is on the shop window: there are none, they
 * are all hidden, the visible ones have nothing filed in them, or what is filed is all drafts. A
 * showcase draws nothing when the shop has no product, when none is on the shelf, or when its own
 * source brings none — only the last is fixed by choosing another source.
 */
export function emptyStateOf(kind: ComponentKind, facts: EmptyFacts): EmptyState | null {
  if (kind === "CATEGORIES") {
    const { categories } = facts
    if (facts.categoriesShown > 0 || categories === null) return null
    if (categories.length === 0) return { kind: "categoriesNone" }

    const active = categories.filter((row) => row.isActive)
    if (active.length === 0) return { kind: "categoriesHidden" }

    const unlinked = active.filter((row) => row.productCount === 0).length
    return unlinked === active.length ? { kind: "categoriesUnlinked", count: unlinked } : { kind: "categoriesDrafts" }
  }

  if (kind === "PRODUCTS") {
    const { products } = facts
    if (products === null) return null
    if (products.total === 0) return { kind: "productsNone" }
    if (products.onShelf === 0) return { kind: "productsOffShelf" }
    return facts.shelfEmpty && products.onShelf !== null ? { kind: "sourceEmpty" } : null
  }

  return null
}
