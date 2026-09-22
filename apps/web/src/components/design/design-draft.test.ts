// Libs
import { describe, expect, it } from "vitest"

// Types
import type { Section } from "@harness-monorepo/contracts"

// App
import {
  applyOrder,
  changesOf,
  isEmptyBlock,
  labelOf,
  reconcile,
  orderedIdsOf,
  previewOf,
  toDraft,
  type Draft,
} from "./design-draft"
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

function draft(id: string, over: Partial<Draft> = {}): Draft {
  return {
    id,
    kind: "BANNER",
    title: id,
    imageUrl: `/${id}.jpg`,
    layout: "FULL",
    isActive: true,
    ...over,
  }
}

function section(id: string, over: Partial<Section> = {}): Section {
  return {
    id,
    kind: "BANNER",
    title: id,
    subtitle: null,
    imageUrl: `/${id}.jpg`,
    layout: "FULL",
    width: "FULL",
    target: "NONE",
    categorySlug: null,
    productSlug: null,
    externalUrl: null,
    items: [],
    position: 0,
    isActive: true,
    createdAt: "2026-09-22T00:00:00.000Z",
    updatedAt: "2026-09-22T00:00:00.000Z",
    ...over,
  }
}

describe("orderedIdsOf", () => {
  it("is the list, in the order the page draws it", () => {
    expect(orderedIdsOf([draft("a"), draft("b"), draft("c")])).toEqual(["a", "b", "c"])
  })

  // The products used to be a sentinel entry whose place the screen read a boolean off. They are
  // an ordinary block with a position now, which is what the move to a sections table bought.
  it("invents no row of its own", () => {
    expect(orderedIdsOf([])).toEqual([])
  })
})

describe("applyOrder", () => {
  const rows = [draft("a"), draft("b"), draft("c")]

  it("takes the dropped order, not the old one", () => {
    expect(applyOrder(rows, ["c", "a", "b"]).map((row) => row.id)).toEqual(["c", "a", "b"])
  })

  it("keeps every other field of the row it moved", () => {
    const hidden = [draft("a", { isActive: false })]

    expect(applyOrder(hidden, ["a"])[0]?.isActive).toBe(false)
  })

  it("drops an id it does not know rather than inventing a row for it", () => {
    expect(applyOrder(rows, ["a", "ghost", "b"]).map((row) => row.id)).toEqual(["a", "b"])
  })
})

describe("changesOf", () => {
  it("writes nothing when nothing moved", () => {
    const { orderChanged, changed } = changesOf([draft("a"), draft("b")], [section("a"), section("b")])

    expect(orderChanged).toBe(false)
    expect(changed).toEqual([])
  })

  it("names only the rows that actually changed", () => {
    const saved = [section("a"), section("b"), section("c")]
    const rows = [draft("a"), draft("b", { isActive: false }), draft("c")]

    // One patch, not three: a write per row would touch `updatedAt` on blocks nobody edited.
    expect(changesOf(rows, saved).changed.map((row) => row.id)).toEqual(["b"])
  })

  it("sends the whole list when the order moved, because the API refuses less", () => {
    const { ids, orderChanged } = changesOf([draft("b"), draft("a")], [section("a"), section("b")])

    expect(orderChanged).toBe(true)
    expect(ids).toEqual(["b", "a"])
  })
})

describe("previewOf", () => {
  it("drops the hidden blocks, exactly as the API drops them from the shop", () => {
    const rows = [draft("a"), draft("b", { isActive: false })]

    expect(previewOf(rows, [section("a"), section("b")]).map((s) => s.id)).toEqual(["a"])
  })

  it("takes the fields dragging cannot change from the saved block", () => {
    const rows = [draft("a")]
    const saved = [section("a", { subtitle: "Confira", width: "CONTAINED", target: "EXTERNAL" })]
    const [only] = previewOf(rows, saved)

    expect(only?.subtitle).toBe("Confira")
    expect(only?.width).toBe("CONTAINED")
    expect(only?.external).toBe(true)
  })
})

describe("labelOf", () => {
  it("calls a titled block by its title", () => {
    expect(labelOf("BANNER", "Frete grátis", ptBR)).toBe("Frete grátis")
  })

  // Four rows all reading "Sem título" say which blocks are unfinished and nothing about which is
  // which — which is the one question a list of blocks exists to answer.
  it("calls an untitled block by its kind", () => {
    expect(labelOf("PRODUCTS", null, ptBR)).toBe("Lista de produtos")
    expect(labelOf("BENEFITS", "   ", ptBR)).toBe("Vantagens")
  })
})

describe("isEmptyBlock", () => {
  // Each of these mirrors a `return null` in a renderer. When the two disagree, the panel lists a
  // block the page does not draw and nothing on screen says why — which is how it was reported.
  it("calls a hero with no pictures empty", () => {
    expect(isEmptyBlock("HERO", null, [])).toBe(true)
    expect(isEmptyBlock("HERO", null, [{}])).toBe(false)
  })

  it("calls a promises band with no promises empty", () => {
    expect(isEmptyBlock("BENEFITS", null, [])).toBe(true)
    expect(isEmptyBlock("BENEFITS", null, [{}, {}])).toBe(false)
  })

  it("calls a heading with no words empty", () => {
    expect(isEmptyBlock("TEXT", null, [])).toBe(true)
    expect(isEmptyBlock("TEXT", "   ", [])).toBe(true)
    expect(isEmptyBlock("TEXT", "Novidades", [])).toBe(false)
  })

  it("calls the announcement bar empty until it says something", () => {
    expect(isEmptyBlock("ANNOUNCEMENT", null, [])).toBe(true)
    expect(isEmptyBlock("ANNOUNCEMENT", "Frete grátis hoje", [])).toBe(false)
  })

  // A banner has a picture the form demands, and the rails have whatever the shop sells — neither
  // can be empty in a way the shopkeeper has to be told about.
  it("never calls a banner or the product rails empty", () => {
    expect(isEmptyBlock("BANNER", null, [])).toBe(false)
    expect(isEmptyBlock("PRODUCTS", null, [])).toBe(false)
    expect(isEmptyBlock("CATEGORIES", null, [])).toBe(false)
  })
})

describe("reconcile", () => {
  /**
   * The bug this exists for, reported as a 409: the draft was only seeded while it was clean, so a
   * block created or deleted after the owner had moved anything never reached it. Publish then
   * sent nine ids for a shop with fourteen blocks, and the reorder endpoint refused the lot.
   */
  it("keeps the order the owner made", () => {
    const current = [draft("c"), draft("a"), draft("b")]
    const saved = [section("a"), section("b"), section("c")]

    expect(reconcile(current, saved).map((row) => row.id)).toEqual(["c", "a", "b"])
  })

  it("takes in a block the server has and the draft does not", () => {
    const current = [draft("b"), draft("a")]
    const saved = [section("a"), section("b"), section("new")]

    // Last, which is where the API puts a new block anyway.
    expect(reconcile(current, saved).map((row) => row.id)).toEqual(["b", "a", "new"])
  })

  it("drops a block the server no longer has", () => {
    const current = [draft("a"), draft("gone"), draft("b")]
    const saved = [section("a"), section("b")]

    expect(reconcile(current, saved).map((row) => row.id)).toEqual(["a", "b"])
  })

  it("never returns fewer rows than the server has, which is what the 409 was about", () => {
    const current = [draft("a")]
    const saved = [section("a"), section("b"), section("c")]

    expect(reconcile(current, saved)).toHaveLength(saved.length)
  })

  it("keeps an unpublished edit on a row that survived", () => {
    const current = [{ ...draft("a"), isActive: false }]
    const saved = [section("a")]

    expect(reconcile(current, saved)[0]?.isActive).toBe(false)
  })
})
