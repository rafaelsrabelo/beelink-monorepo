// Libs
import { describe, expect, it } from "vitest"

// App
import { toDraft } from "./design-draft"
import { withBandCopy, withBlockCopy } from "./design-draft-copy"
import { component, saved, section } from "./design-draft.fixtures"
import { reconcile } from "./design-draft-reconcile"

// Band "a" holds one banner; band "b" a heading and a showcase; band "c" the promises.
const rows = saved.map(toDraft)
// What the API answers: the band "b" copied, hidden, its blocks in the original's order.
const bandCopy = section("b-copy", [component("b1-copy"), component("b2-copy", { kind: "PRODUCTS" })], { isActive: false })
const blockCopy = { ...component("b1-copy"), sectionId: "b", isActive: false }

describe("withBandCopy — a band duplicated, in the draft", () => {
  it("places the copy right after the original, shown as the original is", () => {
    const next = withBandCopy(rows, saved, bandCopy, "b")

    expect(next.map((row) => [row.id, row.isActive])).toEqual([
      ["a", true],
      ["b", true],
      ["b-copy", true],
      ["c", true],
    ])
  })

  // The owner copies what they see: the draft's order and layout, not the server's.
  it("copies the original as the draft holds it, under the copy's ids", () => {
    const arranged = rows.map((row) =>
      row.id === "b" ? { ...row, components: [{ ...row.components[1]!, span: "HALF" as const }, row.components[0]!] } : row,
    )

    const copy = withBandCopy(arranged, saved, bandCopy, "b").find((row) => row.id === "b-copy")

    expect(copy?.components.map((block) => [block.id, block.span])).toEqual([
      ["b2-copy", "HALF"],
      ["b1-copy", "FULL"],
    ])
  })

  // The list is read again before the screen places the copy, or after: the answer is the same.
  it("lands the same whether the draft was reseeded with the hidden copy first or not", () => {
    const withServerCopy = [...saved.slice(0, 2), bandCopy, ...saved.slice(2)]
    const reseeded = reconcile(rows, withServerCopy)

    expect(withBandCopy(reseeded, saved, bandCopy, "b")).toEqual(withBandCopy(rows, saved, bandCopy, "b"))
  })

  // Another tab changed the band before the copy was made: its blocks no longer pair one for one.
  it("shows the copy as the server made it when its blocks do not pair with the original's", () => {
    const changed = section("b-copy", [component("x-copy", { kind: "TEXT" })], { isActive: false })

    const copy = withBandCopy(rows, saved, changed, "b").find((row) => row.id === "b-copy")

    expect(copy).toMatchObject({ isActive: true, components: [{ id: "x-copy", kind: "TEXT" }] })
  })

  it("keeps a hidden original's copy hidden", () => {
    const hidden = rows.map((row) => (row.id === "b" ? { ...row, isActive: false } : row))

    expect(withBandCopy(hidden, saved, bandCopy, "b").find((row) => row.id === "b-copy")?.isActive).toBe(false)
  })
})

describe("withBlockCopy — a block duplicated, in the draft", () => {
  it("places the copy right after the original in its band, laid out and shown as it is", () => {
    const arranged = rows.map((row) =>
      row.id === "b" ? { ...row, components: row.components.map((block) => ({ ...block, span: "THIRD" as const })) } : row,
    )

    const band = withBlockCopy(arranged, blockCopy, "b1").find((row) => row.id === "b")

    expect(band?.components.map((block) => [block.id, block.span, block.isActive])).toEqual([
      ["b1", "THIRD", true],
      ["b1-copy", "THIRD", true],
      ["b2", "THIRD", true],
    ])
  })

  it("lands the same whether the draft was reseeded with the hidden copy first or not", () => {
    const withServerCopy = saved.map((band) =>
      band.id === "b" ? { ...band, components: [band.components[0]!, blockCopy, band.components[1]!] } : band,
    )
    const reseeded = reconcile(rows, withServerCopy)

    expect(withBlockCopy(reseeded, blockCopy, "b1")).toEqual(withBlockCopy(rows, blockCopy, "b1"))
  })

  it("changes nothing when the original is gone", () => {
    expect(withBlockCopy(rows, blockCopy, "ghost")).toEqual(rows)
  })
})
