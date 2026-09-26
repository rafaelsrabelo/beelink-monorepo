// Libs
import { describe, expect, it } from "vitest"

// App
import { emptyStateOf, type EmptyFacts } from "./empty-state"

const facts = (over: Partial<EmptyFacts> = {}): EmptyFacts => ({
  categoriesShown: 0,
  categories: [],
  products: { total: 0, onShelf: 0 },
  shelfEmpty: false,
  ...over,
})

const category = (productCount: number, isActive = true) => ({ isActive, productCount })

describe("emptyStateOf — a categories block with none on the shop window", () => {
  // The case reported: four categories, none with a product, and the visitor's sentence in the editor.
  it("says how many categories have nothing filed in them", () => {
    expect(emptyStateOf("CATEGORIES", facts({ categories: [0, 0, 0, 0].map((n) => category(n)) }))).toEqual({
      kind: "categoriesUnlinked",
      count: 4,
    })
  })

  it("asks for categories when there are none, and says they are hidden when every one is", () => {
    expect(emptyStateOf("CATEGORIES", facts())).toEqual({ kind: "categoriesNone" })
    expect(emptyStateOf("CATEGORIES", facts({ categories: [category(3, false)] }))).toEqual({ kind: "categoriesHidden" })
  })

  // Filed, but only as drafts: linking products would change nothing; publishing them would.
  it("points at the products when what is filed is not published", () => {
    expect(emptyStateOf("CATEGORIES", facts({ categories: [category(2), category(0)] }))).toEqual({ kind: "categoriesDrafts" })
  })

  it("says nothing once a category shows, or while the categories load", () => {
    expect(emptyStateOf("CATEGORIES", facts({ categoriesShown: 1, categories: [category(0)] }))).toBeNull()
    expect(emptyStateOf("CATEGORIES", facts({ categories: null }))).toBeNull()
  })
})

describe("emptyStateOf — a showcase with nothing on its shelf", () => {
  it("asks for the first product when the shop has none", () => {
    expect(emptyStateOf("PRODUCTS", facts({ shelfEmpty: true }))).toEqual({ kind: "productsNone" })
  })

  // Drafts or sold out: every source is as empty, so "choose another source" would send them in circles.
  it("says no product is on the shelf when there are products and none is for sale", () => {
    expect(emptyStateOf("PRODUCTS", facts({ products: { total: 5, onShelf: 0 }, shelfEmpty: true }))).toEqual({
      kind: "productsOffShelf",
    })
  })

  it("points at the source only when products are on the shelf and this source brings none", () => {
    expect(emptyStateOf("PRODUCTS", facts({ products: { total: 12, onShelf: 3 }, shelfEmpty: true }))).toEqual({
      kind: "sourceEmpty",
    })
    expect(emptyStateOf("PRODUCTS", facts({ products: { total: 12, onShelf: 3 } }))).toBeNull()
  })

  it("says nothing while the products load, or when the shelf count cannot be told", () => {
    expect(emptyStateOf("PRODUCTS", facts({ products: null, shelfEmpty: true }))).toBeNull()
    expect(emptyStateOf("PRODUCTS", facts({ products: { total: 300, onShelf: null }, shelfEmpty: true }))).toBeNull()
    expect(emptyStateOf("BANNER", facts())).toBeNull()
  })
})

describe("emptyStateOf — a featured product the shop does not draw", () => {
  it("says the product chosen is not on sale, and nothing while it draws", () => {
    expect(emptyStateOf("FEATURED_PRODUCT", facts({ shelfEmpty: true }))).toEqual({ kind: "featuredUnavailable" })
    expect(emptyStateOf("FEATURED_PRODUCT", facts())).toBeNull()
  })
})

describe("emptyStateOf — a countdown the shop does not draw", () => {
  it("asks for an end when it has none, says when it has passed, and nothing while it counts", () => {
    expect(emptyStateOf("COUNTDOWN", facts())).toEqual({ kind: "countdownUnset" })
    expect(emptyStateOf("COUNTDOWN", facts({ countdownEndsAt: "2020-01-01T00:00:00.000Z" }))).toEqual({ kind: "countdownEnded" })
    expect(emptyStateOf("COUNTDOWN", facts({ countdownEndsAt: "2999-01-01T00:00:00.000Z" }))).toBeNull()
  })
})
