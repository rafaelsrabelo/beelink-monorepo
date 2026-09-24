// Libs
import { describe, expect, it } from "vitest"

// App
import { emptyStateOf, type EmptyFacts } from "./empty-state"

const facts = (over: Partial<EmptyFacts> = {}): EmptyFacts => ({
  categoriesShown: 0,
  categories: 0,
  products: 0,
  shelfEmpty: false,
  ...over,
})

describe("emptyStateOf — why a block draws nothing", () => {
  // The case reported: four categories, none with a product, and the visitor's sentence in the editor.
  it("says how many categories have no product when none shows", () => {
    expect(emptyStateOf("CATEGORIES", facts({ categories: 4 }))).toEqual({ kind: "categoriesUnlinked", count: 4 })
  })

  it("asks for categories when the shop has none, and says nothing once one shows", () => {
    expect(emptyStateOf("CATEGORIES", facts())).toEqual({ kind: "categoriesNone" })
    expect(emptyStateOf("CATEGORIES", facts({ categoriesShown: 1, categories: 4 }))).toBeNull()
  })

  it("asks a showcase for products when the shop has none, and for another source when its own is empty", () => {
    expect(emptyStateOf("PRODUCTS", facts())).toEqual({ kind: "productsNone" })
    expect(emptyStateOf("PRODUCTS", facts({ products: 12, shelfEmpty: true }))).toEqual({ kind: "sourceEmpty" })
    expect(emptyStateOf("PRODUCTS", facts({ products: 12 }))).toBeNull()
  })

  // A notice that flickers from "no categories" to nothing while the counts load is worse than none.
  it("says nothing while the counts are on their way, or for a kind with no such cause", () => {
    expect(emptyStateOf("CATEGORIES", facts({ categories: null }))).toBeNull()
    expect(emptyStateOf("PRODUCTS", facts({ products: null }))).toBeNull()
    expect(emptyStateOf("BANNER", facts())).toBeNull()
  })
})
