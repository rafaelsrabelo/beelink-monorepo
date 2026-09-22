// Libs
import { describe, expect, it } from "vitest"

// Types
import type { Section } from "@harness-monorepo/contracts"

// App
import { applyOrder, changesOf, labelOf, orderedIdsOf, previewOf, toDraft, type Draft } from "./design-draft"
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
