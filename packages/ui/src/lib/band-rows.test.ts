// Libs
import { describe, expect, it } from "vitest"

// Lib
import { besideOf, footSpanOf, rowsOf } from "./band-rows"

describe("rowsOf", () => {
  it("packs blocks on twelve columns the way the grid does, a block that does not fit starting a row", () => {
    expect(rowsOf(["THIRD", "THIRD", "THIRD", "HALF", "FULL"])).toEqual([[0, 1, 2], [3], [4]])
    expect(rowsOf(["TWO_THIRDS", "THIRD", "HALF", "HALF"])).toEqual([[0, 1], [2, 3]])
  })
})

describe("besideOf — what a block beside another takes", () => {
  it("takes its neighbour's slice while that still fits", () => {
    expect(besideOf(["THIRD"], 0)).toEqual({ span: "THIRD", rebalance: [] })
    expect(besideOf(["THIRD", "THIRD"], 1)).toEqual({ span: "THIRD", rebalance: [] })
    expect(besideOf(["HALF"], 0)).toEqual({ span: "HALF", rebalance: [] })
  })

  it("takes the room left when its neighbour's slice does not fit", () => {
    expect(besideOf(["TWO_THIRDS"], 0)).toEqual({ span: "THIRD", rebalance: [] })
  })

  // The owner's case: a whole banner and one more beside it are two halves.
  it("splits a full row evenly with the newcomer", () => {
    expect(besideOf(["FULL"], 0)).toEqual({ span: "HALF", rebalance: [{ index: 0, span: "HALF" }] })
    expect(besideOf(["HALF", "HALF"], 0)).toEqual({
      span: "THIRD",
      rebalance: [
        { index: 0, span: "THIRD" },
        { index: 1, span: "THIRD" },
      ],
    })
    expect(besideOf(["TWO_THIRDS", "THIRD"], 1)).toEqual({ span: "THIRD", rebalance: [{ index: 0, span: "THIRD" }] })
  })

  it("offers nothing beside a row of three, since a third is the narrowest slice", () => {
    expect(besideOf(["THIRD", "THIRD", "THIRD"], 2)).toBeNull()
  })

  it("reads the row the block is in, not the band's first", () => {
    expect(besideOf(["FULL", "THIRD"], 1)).toEqual({ span: "THIRD", rebalance: [] })
    expect(besideOf(["FULL", "FULL"], 1)).toEqual({ span: "HALF", rebalance: [{ index: 1, span: "HALF" }] })
  })
})

describe("footSpanOf — a block added at the foot of a band", () => {
  it("fills the room the last row has left, so it lands beside and not under", () => {
    expect(footSpanOf(["THIRD"])).toBe("TWO_THIRDS")
    expect(footSpanOf(["THIRD", "THIRD"])).toBe("THIRD")
    expect(footSpanOf(["HALF"])).toBe("HALF")
  })

  it("starts a whole row when the last one is full", () => {
    expect(footSpanOf(["FULL"])).toBe("FULL")
    expect(footSpanOf(["HALF", "HALF"])).toBe("FULL")
    expect(footSpanOf([])).toBe("FULL")
  })
})
