// Libs
import { describe, expect, it } from "vitest"

// App
import { applyComponentOrder, applyOrder, orderedIdsOf, serverPlaceOf } from "./design-draft"
import { component, draft, saved, section } from "./design-draft.fixtures"
import { reconcile } from "./design-draft-reconcile"

describe("reconcile — the server changes, the arrangement survives", () => {
  // A new band lands right after the one it follows on the server, in the order the owner arranged.
  it("keeps the arranged order and places what the server grew after its neighbour there", () => {
    const arranged = applyOrder(draft, ["c", "b", "a"])
    const grown = [...saved, section("d", [component("d1")])]

    expect(orderedIdsOf(reconcile(arranged, grown))).toEqual(["c", "d", "b", "a"])
  })

  // The "+" between a and b asked the API for the second place; the draft shows it there too.
  it("places a band added in the middle where it was added", () => {
    const between = [saved[0]!, section("x", [component("x1")]), ...saved.slice(1)]

    expect(orderedIdsOf(reconcile(draft, between))).toEqual(["a", "x", "b", "c"])
    expect(orderedIdsOf(reconcile(draft, [section("x", [component("x1")]), ...saved]))).toEqual(["x", "a", "b", "c"])
  })

  it("drops a band the server no longer has", () => {
    expect(orderedIdsOf(reconcile(draft, saved.slice(1)))).toEqual(["b", "c"])
  })

  it("does the same one level down: a new component lands after its neighbour, a deleted one goes", () => {
    const arranged = applyComponentOrder(draft, "b", ["b2", "b1"])
    const changed = saved.map((row) =>
      row.id === "b" ? section("b", [component("b2", { kind: "PRODUCTS" }), component("b3")]) : row,
    )

    const next = reconcile(arranged, changed)

    expect(next[1]!.components.map((row) => row.id)).toEqual(["b2", "b3"])
  })

  // The block half of the "+": the draft moved b2 above b1, and a block added first on the server
  // lands first in the draft too — not appended after the owner's order.
  it("places a block added inside a rearranged band where its + was", () => {
    const arranged = applyComponentOrder(draft, "b", ["b2", "b1"])
    const at = serverPlaceOf(["b2", "b1"], ["b1", "b2"], 0)
    const grown = saved.map((row) =>
      row.id === "b" ? section("b", [component("x"), component("b1"), component("b2", { kind: "PRODUCTS" })]) : row,
    )

    expect(at).toBe(0)
    expect(reconcile(arranged, grown)[1]!.components.map((row) => row.id)).toEqual(["x", "b2", "b1"])
  })
})
