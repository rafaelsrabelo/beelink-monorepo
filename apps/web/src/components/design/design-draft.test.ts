// Libs
import { describe, expect, it } from "vitest"

// Types
import type { Banner } from "@harness-monorepo/contracts"

// App
import { PRODUCTS_ROW_ID } from "@harness-monorepo/ui/blocks/design/banner-arrangement"
import { applyOrder, changesOf, orderedIdsOf, toDraft, type Draft } from "./design-draft"

function draft(id: string, belowProducts = false): Draft {
  return { id, title: id, imageUrl: `/${id}.jpg`, layout: "FULL", isActive: true, belowProducts }
}

function banner(id: string, over: Partial<Banner> = {}): Banner {
  return {
    id,
    title: id,
    subtitle: null,
    imageUrl: `/${id}.jpg`,
    layout: "FULL",
    target: "NONE",
    categorySlug: null,
    productSlug: null,
    externalUrl: null,
    position: 0,
    belowProducts: false,
    isActive: true,
    createdAt: "2026-09-22T00:00:00.000Z",
    updatedAt: "2026-09-22T00:00:00.000Z",
    ...over,
  }
}

describe("orderedIdsOf", () => {
  it("puts the products' row exactly where the sides meet", () => {
    const ids = orderedIdsOf([draft("a"), draft("b", true), draft("c")])

    expect(ids).toEqual(["a", "c", PRODUCTS_ROW_ID, "b"])
  })

  it("keeps the row even when there is nothing to arrange", () => {
    // Otherwise the board has no id at all and the products cannot be dragged anywhere.
    expect(orderedIdsOf([])).toEqual([PRODUCTS_ROW_ID])
  })
})

describe("applyOrder", () => {
  const rows = [draft("a"), draft("b"), draft("c")]

  it("reads each poster's side off where the products' row landed", () => {
    const next = applyOrder(rows, ["a", PRODUCTS_ROW_ID, "b", "c"])

    expect(next.map((row) => [row.id, row.belowProducts])).toEqual([
      ["a", false],
      ["b", true],
      ["c", true],
    ])
  })

  it("sends every poster below when the row is dragged to the top", () => {
    const next = applyOrder(rows, [PRODUCTS_ROW_ID, "a", "b", "c"])

    expect(next.every((row) => row.belowProducts)).toBe(true)
  })

  it("sends every poster above when the row is dragged to the bottom", () => {
    const next = applyOrder(rows, ["a", "b", "c", PRODUCTS_ROW_ID])

    expect(next.some((row) => row.belowProducts)).toBe(false)
  })

  it("keeps the dragged order, not the old one", () => {
    const next = applyOrder(rows, ["c", "a", PRODUCTS_ROW_ID, "b"])

    expect(next.map((row) => row.id)).toEqual(["c", "a", "b"])
  })

  // The id is a sentinel, so a rename in the block would silently send every poster to one side
  // and nothing else in either file would fail.
  it("changes nothing when the products' row is missing", () => {
    expect(applyOrder(rows, ["a", "b", "c"])).toEqual(rows)
  })
})

describe("changesOf", () => {
  it("writes nothing when nothing moved", () => {
    const saved = [banner("a"), banner("b")]
    const { orderChanged, changed } = changesOf([draft("a"), draft("b")], saved)

    expect(orderChanged).toBe(false)
    expect(changed).toEqual([])
  })

  it("names only the rows that actually changed", () => {
    const saved = [banner("a"), banner("b"), banner("c")]
    const rows = [draft("a"), { ...draft("b"), isActive: false }, draft("c")]

    // One patch, not three: a write per row would touch `updatedAt` on posters nobody edited.
    expect(changesOf(rows, saved).changed.map((row) => row.id)).toEqual(["b"])
  })

  it("counts a side as a change", () => {
    const saved = [banner("a")]

    expect(changesOf([draft("a", true)], saved).changed.map((row) => row.id)).toEqual(["a"])
  })

  it("sends the whole list when the order moved, because the API refuses less", () => {
    const saved = [banner("a"), banner("b")]
    const { ids, orderChanged } = changesOf([draft("b"), draft("a")], saved)

    expect(orderChanged).toBe(true)
    expect(ids).toEqual(["b", "a"])
  })
})

describe("toDraft", () => {
  it("carries only what the arrangement can change", () => {
    expect(toDraft(banner("a", { subtitle: "hi", target: "EXTERNAL" }))).toEqual({
      id: "a",
      title: "a",
      imageUrl: "/a.jpg",
      layout: "FULL",
      isActive: true,
      belowProducts: false,
    })
  })
})
